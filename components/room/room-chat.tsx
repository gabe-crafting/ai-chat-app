"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Composer } from "@/components/room/composer";
import { MessageList } from "@/components/room/message-list";
import { ScrollToBottomButton } from "@/components/room/scroll-to-bottom-button";
import type { AiStreamEvent, PendingAiMessage } from "@/lib/rooms/ai-stream";
import { readApiJson } from "@/lib/api/parse-response";
import { getModelLabel, normalizeModelId } from "@/lib/ai/models";
import { sendRoomMessage, setAllMessagesHiddenFromAi, setMessageHiddenFromAi, setRoomAiReasoningEffort, setRoomAiSystemPrompt } from "@/lib/rooms/actions";
import { normalizeAiReasoningEffort, type AiReasoningEffort } from "@/lib/ai/reasoning";
import type { ChatMessage } from "@/lib/rooms/message-utils";
import { enrichReplyAuthors } from "@/lib/rooms/message-utils";
import { createClient } from "@/lib/supabase/client";

type RoomChatProps = {
  roomId: string;
  userId: string;
  roomModel: string;
  initialMessages: ChatMessage[];
  canPromptAi: boolean;
  isOwner: boolean;
  aiSystemPrompt?: string;
  aiReasoningEffort?: string;
  authorNames: Record<string, string>;
  readOnly?: boolean;
};

function appendMessage(
  current: ChatMessage[],
  message: ChatMessage,
): ChatMessage[] {
  if (current.some((entry) => entry.id === message.id)) {
    return current;
  }
  return enrichReplyAuthors([...current, message]);
}

function withAuthorName(
  message: ChatMessage,
  authorNames: Record<string, string>,
): ChatMessage {
  if (
    message.role === "user" &&
    message.userId &&
    message.authorName === "Unknown" &&
    authorNames[message.userId]
  ) {
    return { ...message, authorName: authorNames[message.userId] };
  }
  return message;
}

function waitForAssistantReply(
  getMessages: () => ChatMessage[],
  promptMessageId: string,
  timeoutMs = 15000,
) {
  return new Promise<boolean>((resolve) => {
    const started = Date.now();

    const check = () => {
      const found = getMessages().some(
        (message) =>
          message.role === "assistant" && message.replyToId === promptMessageId,
      );
      if (found) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(check, 200);
    };

    check();
  });
}

function waitForNewAssistantMessage(
  getMessages: () => ChatMessage[],
  previousAssistantCount: number,
  timeoutMs = 15000,
) {
  return new Promise<boolean>((resolve) => {
    const started = Date.now();

    const check = () => {
      const assistantCount = getMessages().filter(
        (message) => message.role === "assistant",
      ).length;
      if (assistantCount > previousAssistantCount) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      window.setTimeout(check, 200);
    };

    check();
  });
}

export function RoomChat({
  roomId,
  userId,
  roomModel,
  initialMessages,
  canPromptAi,
  isOwner,
  aiSystemPrompt: initialAiSystemPrompt = "",
  aiReasoningEffort: initialAiReasoningEffort = "off",
  authorNames,
  readOnly = false,
}: RoomChatProps) {
  const [messages, setMessages] = useState(() =>
    enrichReplyAuthors(initialMessages),
  );
  const [aiSystemPrompt, setAiSystemPrompt] = useState(initialAiSystemPrompt);
  const [aiReasoningEffort, setAiReasoningEffort] = useState(
    normalizeAiReasoningEffort(initialAiReasoningEffort),
  );
  const [pendingAi, setPendingAi] = useState<PendingAiMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const authorNamesRef = useRef(authorNames);
  authorNamesRef.current = authorNames;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const scrollBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAiSystemPrompt(initialAiSystemPrompt);
  }, [initialAiSystemPrompt]);

  useEffect(() => {
    setAiReasoningEffort(normalizeAiReasoningEffort(initialAiReasoningEffort));
  }, [initialAiReasoningEffort]);

  useEffect(() => {
    setMessages((current) =>
      enrichReplyAuthors(
        current.map((message) => withAuthorName(message, authorNames)),
      ),
    );
  }, [authorNames]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const message = withAuthorName(
          payload as ChatMessage,
          authorNamesRef.current,
        );
        setMessages((current) => appendMessage(current, message));
        setPendingAi((current) => {
          if (!current) return current;
          if (message.role === "assistant") {
            return null;
          }
          return current;
        });
      })
      .on("broadcast", { event: "ai-token" }, ({ payload }) => {
        const event = payload as AiStreamEvent;

        if (event.type === "start") {
          setPendingAi({
            streamId: event.streamId,
            model: getModelLabel(event.model),
            content: "",
            replyToId: event.promptMessageId,
          });
          return;
        }

        if (event.type === "delta") {
          setPendingAi((current) => {
            if (!current || current.streamId !== event.streamId) {
              return current;
            }
            return {
              ...current,
              content: current.content + event.text,
            };
          });
          return;
        }

        if (event.type === "end") {
          setPendingAi((current) =>
            current?.streamId === event.streamId ? null : current,
          );
        }
      })
      .on("broadcast", { event: "message_ai_visibility" }, ({ payload }) => {
        const { messageId, hiddenFromAi } = payload as {
          messageId: string;
          hiddenFromAi: boolean;
        };

        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? { ...message, hiddenFromAi }
              : message,
          ),
        );
      })
      .on("broadcast", { event: "all_messages_ai_visibility" }, ({ payload }) => {
        const { hiddenFromAi } = payload as { hiddenFromAi: boolean };

        setMessages((current) =>
          current.map((message) => ({ ...message, hiddenFromAi })),
        );
      })
      .on("broadcast", { event: "room_ai_system_prompt" }, ({ payload }) => {
        const { aiSystemPrompt: nextPrompt } = payload as {
          aiSystemPrompt: string | null;
        };
        setAiSystemPrompt(nextPrompt ?? "");
      })
      .on("broadcast", { event: "room_ai_reasoning_effort" }, ({ payload }) => {
        const { reasoningEffort } = payload as { reasoningEffort: string };
        setAiReasoningEffort(normalizeAiReasoningEffort(reasoningEffort));
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = useCallback(
    async (
      content: string,
      replyToId?: string | null,
      imageUrl?: string | null,
    ) => {
      const result = await sendRoomMessage(
        roomId,
        content,
        replyToId,
        imageUrl,
      );

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.message) {
        const message = withAuthorName(
          result.message,
          authorNamesRef.current,
        );
        setMessages((current) => appendMessage(current, message));
      }
    },
    [roomId],
  );

  const sendAiPrompt = useCallback(
    async (
      prompt: string,
      replyToId: string | null,
      model: string,
      imageUrl?: string | null,
    ) => {
      const assistantCountBefore = messagesRef.current.filter(
        (message) => message.role === "assistant",
      ).length;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          prompt,
          replyToId,
          model: normalizeModelId(model),
          imageUrl,
        }),
      });

      const { data, error } = await readApiJson<{
        error?: string;
        promptMessage?: ChatMessage;
        message?: ChatMessage;
      }>(response);

      if (data?.promptMessage) {
        const promptMessage = withAuthorName(
          data.promptMessage,
          authorNamesRef.current,
        );
        setMessages((current) => appendMessage(current, promptMessage));
      }

      if (data?.message) {
        const message = withAuthorName(
          data.message,
          authorNamesRef.current,
        );
        setMessages((current) => appendMessage(current, message));
        setPendingAi(null);
        return;
      }

      if (error) {
        const promptMessageId = data?.promptMessage?.id;
        const delivered = promptMessageId
          ? await waitForAssistantReply(
              () => messagesRef.current,
              promptMessageId,
            )
          : await waitForNewAssistantMessage(
              () => messagesRef.current,
              assistantCountBefore,
            );

        if (delivered) {
          setPendingAi(null);
          return;
        }

        throw new Error(error);
      }

      if (!response.ok) {
        throw new Error("Failed to prompt the AI.");
      }
    },
    [roomId],
  );

  const handleHiddenFromAiChange = useCallback(
    async (messageId: string, hiddenFromAi: boolean) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, hiddenFromAi } : message,
        ),
      );

      const result = await setMessageHiddenFromAi(
        roomId,
        messageId,
        hiddenFromAi,
      );

      if (result.error) {
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId
              ? { ...message, hiddenFromAi: !hiddenFromAi }
              : message,
          ),
        );
        throw new Error(result.error);
      }
    },
    [roomId],
  );

  const handleSetAllHiddenFromAi = useCallback(async (hiddenFromAi: boolean) => {
    const previous = messagesRef.current.map((message) => ({
      id: message.id,
      hiddenFromAi: message.hiddenFromAi,
    }));

    setMessages((current) =>
      current.map((message) => ({ ...message, hiddenFromAi })),
    );

    const result = await setAllMessagesHiddenFromAi(roomId, hiddenFromAi);

    if (result.error) {
      setMessages((current) =>
        current.map((message) => {
          const prior = previous.find((entry) => entry.id === message.id);
          return prior
            ? { ...message, hiddenFromAi: prior.hiddenFromAi }
            : message;
        }),
      );
      throw new Error(result.error);
    }
  }, [roomId]);

  const handleSaveAiSystemPrompt = useCallback(
    async (prompt: string) => {
      const result = await setRoomAiSystemPrompt(roomId, prompt);

      if (result.error) {
        throw new Error(result.error);
      }

      setAiSystemPrompt(prompt.trim());
    },
    [roomId],
  );

  const handleAiReasoningEffortChange = useCallback(
    async (effort: string) => {
      const normalized = normalizeAiReasoningEffort(effort);
      const result = await setRoomAiReasoningEffort(
        roomId,
        normalized as AiReasoningEffort,
      );

      if (result.error) {
        throw new Error(result.error);
      }

      setAiReasoningEffort(normalized);
    },
    [roomId],
  );

  const allHiddenFromAi =
    messages.length > 0 && messages.every((message) => message.hiddenFromAi);

  return (
    <>
      <ScrollToBottomButton targetRef={scrollBottomRef} />
      <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border">
      <MessageList
        messages={messages}
        pendingAi={pendingAi}
        currentUserId={userId}
        onReply={setReplyTarget}
        readOnly={readOnly}
        canManageAiContext={canPromptAi && !readOnly}
        bottomRef={scrollBottomRef}
        onHiddenFromAiChange={handleHiddenFromAiChange}
      />
      {!readOnly ? (
        <Composer
          roomId={roomId}
          canPromptAi={canPromptAi}
          isOwner={isOwner}
          roomModel={roomModel}
          aiSystemPrompt={aiSystemPrompt}
          onSaveAiSystemPrompt={isOwner ? handleSaveAiSystemPrompt : undefined}
          allHiddenFromAi={allHiddenFromAi}
          onSetAllHiddenFromAi={
            canPromptAi ? handleSetAllHiddenFromAi : undefined
          }
          aiReasoningEffort={aiReasoningEffort}
          onAiReasoningEffortChange={
            canPromptAi ? handleAiReasoningEffortChange : undefined
          }
          replyTarget={replyTarget}
          onClearReply={() => setReplyTarget(null)}
          onSendMessage={sendMessage}
          onSendAiPrompt={canPromptAi ? sendAiPrompt : undefined}
        />
      ) : null}
    </section>
    </>
  );
}
