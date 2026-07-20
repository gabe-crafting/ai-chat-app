"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  normalizeAiReasoningEffort,
  type AiReasoningEffort,
} from "@/lib/ai/reasoning";
import { isAdminViewer } from "@/lib/auth/admin-viewer";
import {
  DEFAULT_AI_MODEL,
  isAllowedModel,
} from "@/lib/ai/models";

import { mapMessageRow, MESSAGE_SELECT, type ChatMessage } from "@/lib/rooms/message-utils";
import { mapMessageWithReply } from "@/lib/rooms/message-replies";
import { assertReplyTarget } from "@/lib/rooms/reply-validation";
import {
  broadcastParticipantsChanged,
  broadcastParticipantKicked,
  broadcastMessageAiVisibility,
  broadcastAllMessagesAiVisibility,
  broadcastRoomAiReasoningEffort,
  broadcastRoomAiSystemPrompt,
  broadcastRoomMessage,
} from "@/lib/rooms/realtime-broadcast";
import { createClient } from "@/lib/supabase/server";

export type RoomActionState = {
  error?: string;
};

export async function createRoom(
  _prevState: RoomActionState,
  formData: FormData,
): Promise<RoomActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const modelInput = String(formData.get("model") ?? DEFAULT_AI_MODEL).trim();
  const model = isAllowedModel(modelInput) ? modelInput : DEFAULT_AI_MODEL;

  if (!name) {
    return { error: "Room name is required." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_room", {
    p_name: name,
    p_model: model,
  });

  if (error) {
    return { error: error.message };
  }

  const room = data?.[0];
  if (!room?.room_id) {
    return { error: "Failed to create room." };
  }

  redirect(`/rooms/${room.room_id}`);
}

export async function joinRoom(
  inviteCode: string,
): Promise<{ roomId: string } | { error: string }> {
  const code = inviteCode.trim();
  if (!code) {
    return { error: "Invite code is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You must be signed in to join a room." };
  }

  if (isAdminViewer(user)) {
    return { error: "You cannot join rooms." };
  }

  const { data, error } = await supabase.rpc("join_room", {
    p_invite_code: code,
  });

  if (error) {
    return { error: error.message };
  }

  const result = data?.[0];
  if (!result?.room_id) {
    return { error: "Invalid invite code." };
  }

  await broadcastParticipantsChanged(result.room_id, user.id);

  return { roomId: result.room_id };
}

export async function joinRoomByInviteCode(inviteCode: string) {
  const result = await joinRoom(inviteCode);

  if ("error" in result) {
    throw new Error(result.error);
  }

  redirect(`/rooms/${result.roomId}`);
}

export async function setCanPromptAi(
  roomId: string,
  userId: string,
  canPromptAi: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("room_participants")
    .update({ can_prompt_ai: canPromptAi })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  await broadcastParticipantsChanged(roomId, userId);

  revalidatePath(`/rooms/${roomId}`);
  return {};
}

export async function kickParticipant(
  roomId: string,
  userId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You are not signed in." };
  }

  if (userId === user.id) {
    return { error: "You cannot remove yourself from the room." };
  }

  const { data: target, error: targetError } = await supabase
    .from("room_participants")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (targetError) {
    return { error: targetError.message };
  }

  if (!target) {
    return { error: "Participant not found." };
  }

  if (target.role === "owner") {
    return { error: "You cannot remove the room owner." };
  }

  const { error } = await supabase
    .from("room_participants")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) {
    return { error: error.message };
  }

  await broadcastParticipantKicked(roomId, userId);
  revalidatePath(`/rooms/${roomId}`);
  return {};
}

export async function sendRoomMessage(
  roomId: string,
  content: string,
  replyToId?: string | null,
  imageUrl?: string | null,
): Promise<{ message?: ChatMessage; error?: string }> {
  const text = content.trim();
  const image = imageUrl?.trim() || null;

  if (!text && !image) {
    return { error: "Message cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You are not signed in. Refresh the page and try again." };
  }

  if (isAdminViewer(user)) {
    return { error: "You cannot send messages." };
  }

  if (replyToId) {
    const validation = await assertReplyTarget(roomId, replyToId);
    if (validation.error) {
      return { error: validation.error };
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      room_id: roomId,
      user_id: user.id,
      role: "user",
      content: text,
      image_url: image,
      reply_to_id: replyToId ?? null,
    })
    .select(MESSAGE_SELECT)
    .single();

  if (error) {
    return { error: error.message };
  }

  const message = await mapMessageWithReply(data);
  await broadcastRoomMessage(roomId, message);

  return { message };
}

export async function setMessageHiddenFromAi(
  roomId: string,
  messageId: string,
  hiddenFromAi: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You are not signed in." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("can_prompt_ai")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participantError) {
    return { error: participantError.message };
  }

  if (!participant?.can_prompt_ai) {
    return { error: "You do not have permission to change AI context." };
  }

  const { error } = await supabase
    .from("messages")
    .update({ hidden_from_ai: hiddenFromAi })
    .eq("id", messageId)
    .eq("room_id", roomId);

  if (error) {
    return { error: error.message };
  }

  await broadcastMessageAiVisibility(roomId, messageId, hiddenFromAi);
  return {};
}

async function assertCanManageAiContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string,
) {
  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("can_prompt_ai")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (participantError) {
    return { error: participantError.message };
  }

  if (!participant?.can_prompt_ai) {
    return { error: "You do not have permission to change AI context." };
  }

  return {};
}

export async function setAllMessagesHiddenFromAi(
  roomId: string,
  hiddenFromAi: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You are not signed in." };
  }

  const permission = await assertCanManageAiContext(supabase, roomId, user.id);
  if (permission.error) {
    return permission;
  }

  const { error } = await supabase
    .from("messages")
    .update({ hidden_from_ai: hiddenFromAi })
    .eq("room_id", roomId);

  if (error) {
    return { error: error.message };
  }

  await broadcastAllMessagesAiVisibility(roomId, hiddenFromAi);
  return {};
}

export async function setRoomAiSystemPrompt(
  roomId: string,
  aiSystemPrompt: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You are not signed in." };
  }

  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participantError) {
    return { error: participantError.message };
  }

  if (participant?.role !== "owner") {
    return { error: "Only the room owner can change the system prompt." };
  }

  const normalized = aiSystemPrompt.trim();
  const { error } = await supabase
    .from("rooms")
    .update({ ai_system_prompt: normalized || null })
    .eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  await broadcastRoomAiSystemPrompt(roomId, normalized || null);
  return {};
}

export async function setRoomAiReasoningEffort(
  roomId: string,
  reasoningEffort: AiReasoningEffort,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "You are not signed in." };
  }

  const normalized = normalizeAiReasoningEffort(reasoningEffort);
  const { error } = await supabase.rpc("set_room_ai_reasoning_effort", {
    p_room_id: roomId,
    p_effort: normalized === "off" ? null : normalized,
  });

  if (error) {
    return { error: error.message };
  }

  await broadcastRoomAiReasoningEffort(roomId, normalized);
  return {};
}
