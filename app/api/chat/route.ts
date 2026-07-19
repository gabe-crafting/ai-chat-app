import { streamText } from "ai";
import { NextResponse } from "next/server";

import { messagesToModelHistory } from "@/lib/ai/chat-context";
import { getChatErrorResponse } from "@/lib/ai/chat-errors";
import { buildUserModelContent } from "@/lib/ai/message-content";
import {
  modelSupportsImageOutput,
  modelSupportsVision,
  normalizeModelId,
} from "@/lib/ai/models";
import { AI_MAX_OUTPUT_TOKENS, getOpenRouter } from "@/lib/ai/openrouter";
import {
  AI_QUALITY_EXPERIMENT_MAX_OUTPUT_TOKENS,
  getBaselineSystemPrompt,
  getExperimentModelSettings,
  getExperimentSystemPrompt,
  isAiQualityExperimentEnabled,
} from "@/lib/ai/quality-experiment";
import { uploadGeneratedRoomImage } from "@/lib/rooms/image-storage";
import { mapMessageWithReply } from "@/lib/rooms/message-replies";
import {
  attachReplyPreview,
  enrichReplyAuthors,
  mapMessageRow,
  MESSAGE_SELECT,
  type ChatMessage,
} from "@/lib/rooms/message-utils";
import { assertReplyTarget } from "@/lib/rooms/reply-validation";
import {
  RoomChannelBroadcaster,
  broadcastRoomMessage,
} from "@/lib/rooms/realtime-broadcast";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Reasoning + web search can exceed the baseline 60s budget. */
export const maxDuration = 120;

type ChatRequestBody = {
  roomId?: string;
  prompt?: string;
  replyToId?: string | null;
  model?: string | null;
  imageUrl?: string | null;
};

export async function POST(request: Request) {
  let body: ChatRequestBody;

  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const roomId = body.roomId?.trim();
  const prompt = body.prompt?.trim() ?? "";
  const replyToId = body.replyToId?.trim() || null;
  const requestedModel = body.model?.trim() || null;
  const imageUrl = body.imageUrl?.trim() || null;

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("can_prompt_ai")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participantError) {
    return NextResponse.json(
      { error: participantError.message },
      { status: 500 },
    );
  }

  if (!participant) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!participant.can_prompt_ai) {
    return NextResponse.json(
      { error: "You do not have permission to prompt the AI in this room." },
      { status: 403 },
    );
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, model")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "Room not found." }, { status: 404 });
  }

  const model = normalizeModelId(requestedModel ?? room.model);

  if (imageUrl && !modelSupportsVision(model)) {
    return NextResponse.json(
      {
        error:
          "This model cannot analyze images. Choose a vision-capable model (e.g. GPT-4o Mini, Grok, or Gemini Image).",
      },
      { status: 400 },
    );
  }

  if (replyToId) {
    const validation = await assertReplyTarget(roomId, replyToId);
    if (validation.error) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();

  const prompterName = profile?.display_name ?? "User";

  let replyContext: { content: string } | null = null;
  let replyImageUrl: string | null = null;

  if (replyToId) {
    const { data: replyTarget } = await supabase
      .from("messages")
      .select(MESSAGE_SELECT)
      .eq("id", replyToId)
      .maybeSingle();

    if (replyTarget) {
      const mapped = mapMessageRow(replyTarget, { [user.id]: prompterName });
      replyContext = {
        content: mapped.content,
      };
      replyImageUrl = mapped.imageUrl;
    }
  }

  if (!prompt && !imageUrl && !replyImageUrl) {
    return NextResponse.json(
      { error: "Add a prompt or attach an image." },
      { status: 400 },
    );
  }

  if (replyImageUrl && !modelSupportsVision(model)) {
    return NextResponse.json(
      {
        error:
          "This model cannot analyze images. Choose a vision-capable model (e.g. GPT-4o Mini, Grok, or Gemini Image).",
      },
      { status: 400 },
    );
  }

  const savedPromptContent =
    prompt ||
    (imageUrl
      ? "Describe this image."
      : replyImageUrl
        ? "Analyze this image."
        : "");

  const { data: history, error: historyError } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (historyError) {
    return NextResponse.json(
      { error: historyError.message },
      { status: 500 },
    );
  }

  const authorNames = { [user.id]: prompterName };
  const mappedHistory = enrichReplyAuthors(
    (history ?? []).map((row) => mapMessageRow(row, authorNames)),
  );

  const qualityExperiment = isAiQualityExperimentEnabled();
  const historyMessages = messagesToModelHistory(mappedHistory, model, {
    labelSpeakers: qualityExperiment,
  });

  const { data: promptRow, error: promptError } = await supabase
    .from("messages")
    .insert({
      room_id: roomId,
      user_id: user.id,
      role: "user",
      content: savedPromptContent,
      image_url: imageUrl ?? replyImageUrl,
      reply_to_id: replyToId,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (promptError || !promptRow) {
    return NextResponse.json(
      { error: promptError?.message ?? "Failed to save your question." },
      { status: 500 },
    );
  }

  const promptMessage = await mapMessageWithReply(promptRow, authorNames);
  await broadcastRoomMessage(roomId, promptMessage);

  const streamId = crypto.randomUUID();
  const broadcaster = new RoomChannelBroadcaster(roomId);

  const latestUserContent = buildUserModelContent(
    {
      ...promptMessage,
      content: savedPromptContent,
      imageUrl: imageUrl ?? replyImageUrl ?? promptMessage.imageUrl,
      replyTo: replyContext
        ? {
            id: replyToId ?? "",
            authorName: promptMessage.replyTo?.authorName ?? "",
            content: replyContext.content,
            role: "user",
            imageUrl: replyImageUrl,
          }
        : promptMessage.replyTo,
    },
    model,
    { labelSpeaker: qualityExperiment },
  );

  const supportsImageOutput = modelSupportsImageOutput(model);
  const systemPrompt = qualityExperiment
    ? getExperimentSystemPrompt(supportsImageOutput)
    : getBaselineSystemPrompt(supportsImageOutput);

  try {
    await broadcaster.send("ai-token", {
      type: "start",
      streamId,
      roomId,
      model,
      promptMessageId: promptMessage.id,
    });

    const openrouter = getOpenRouter();
    const experimentSettings = qualityExperiment
      ? getExperimentModelSettings()
      : null;
    const result = streamText({
      model: experimentSettings
        ? openrouter.chat(model, experimentSettings)
        : openrouter.chat(model),
      maxOutputTokens: qualityExperiment
        ? AI_QUALITY_EXPERIMENT_MAX_OUTPUT_TOKENS
        : AI_MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: [
        ...historyMessages,
        {
          role: "user",
          content: latestUserContent,
        },
      ],
      onChunk: async ({ chunk }) => {
        if (chunk.type === "text-delta" && chunk.text) {
          await broadcaster.send("ai-token", {
            type: "delta",
            streamId,
            text: chunk.text,
          });
        }
      },
    });

    const text = (await result.text).trim();
    const files = await result.files;
    let generatedImageUrl: string | null = null;

    for (const file of files) {
      if (!file.mediaType.startsWith("image/")) {
        continue;
      }

      generatedImageUrl = await uploadGeneratedRoomImage(
        roomId,
        file.uint8Array,
        file.mediaType,
      );
      break;
    }

    if (!text && !generatedImageUrl) {
      await broadcaster.send("ai-token", { type: "end", streamId });
      return NextResponse.json(
        { error: "The model returned an empty response." },
        { status: 502 },
      );
    }

    const assistantContent =
      text || (generatedImageUrl ? "Here's the updated image." : "");

    const admin = createAdminClient();
    const { data: inserted, error: insertError } = await admin
      .from("messages")
      .insert({
        room_id: roomId,
        user_id: null,
        role: "assistant",
        content: assistantContent,
        image_url: generatedImageUrl,
        model,
        reply_to_id: promptMessage.id,
      })
      .select(MESSAGE_SELECT)
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        { error: insertError?.message ?? "Failed to save assistant message." },
        { status: 500 },
      );
    }

    const message = attachReplyPreview(
      mapMessageRow(inserted, authorNames),
      promptMessage,
    );
    await broadcastRoomMessage(roomId, message);
    await broadcaster.send("ai-token", { type: "end", streamId });

    return NextResponse.json({
      promptMessage,
      message,
    } satisfies { promptMessage: ChatMessage; message: ChatMessage });
  } catch (error) {
    console.error("[api/chat]", error);
    try {
      await broadcaster.send("ai-token", { type: "end", streamId });
    } catch {
      // ignore cleanup errors
    }

    const { message, status } = getChatErrorResponse(error);

    return NextResponse.json({ error: message }, { status });
  } finally {
    await broadcaster.close();
  }
}
