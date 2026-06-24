"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Composer } from "@/components/room/composer";
import { MessageList } from "@/components/room/message-list";
import type { AiStreamEvent, PendingAiMessage } from "@/lib/rooms/ai-stream";
import { getModelLabel, normalizeModelId } from "@/lib/ai/models";
import { sendRoomMessage } from "@/lib/rooms/actions";
import type { ChatMessage } from "@/lib/rooms/message-utils";
import { enrichReplyAuthors } from "@/lib/rooms/message-utils";
import { createClient } from "@/lib/supabase/client";

type RoomChatProps = {
  roomId: string;
  userId: string;
  roomModel: string;
  initialMessages: ChatMessage[];
  canPromptAi: boolean;
  authorNames: Record<string, string>;
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

export function RoomChat({
  roomId,
  userId,
  roomModel,
  initialMessages,
  canPromptAi,
  authorNames,
}: RoomChatProps) {
  const [messages, setMessages] = useState(() =>
    enrichReplyAuthors(initialMessages),
  );
  const [pendingAi, setPendingAi] = useState<PendingAiMessage | null>(null);
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const authorNamesRef = useRef(authorNames);
  authorNamesRef.current = authorNames;

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

      const data = (await response.json()) as {
        error?: string;
        promptMessage?: ChatMessage;
        message?: ChatMessage;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to prompt the AI.");
      }

      if (data.promptMessage) {
        const promptMessage = withAuthorName(
          data.promptMessage,
          authorNamesRef.current,
        );
        setMessages((current) => appendMessage(current, promptMessage));
      }

      if (data.message) {
        const message = withAuthorName(
          data.message,
          authorNamesRef.current,
        );
        setMessages((current) => appendMessage(current, message));
        setPendingAi(null);
      }
    },
    [roomId],
  );

  return (
    <section className="flex min-h-[420px] flex-col overflow-hidden rounded-lg border">
      <MessageList
        messages={messages}
        pendingAi={pendingAi}
        currentUserId={userId}
        onReply={setReplyTarget}
      />
      <Composer
        roomId={roomId}
        canPromptAi={canPromptAi}
        roomModel={roomModel}
        replyTarget={replyTarget}
        onClearReply={() => setReplyTarget(null)}
        onSendMessage={sendMessage}
        onSendAiPrompt={canPromptAi ? sendAiPrompt : undefined}
      />
    </section>
  );
}
