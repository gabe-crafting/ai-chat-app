"use client";

import { useEffect, useRef } from "react";

import { MessageImage } from "@/components/room/image-attachment";
import type { PendingAiMessage } from "@/lib/rooms/ai-stream";
import type { ChatMessage } from "@/lib/rooms/message-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessageListProps = {
  messages: ChatMessage[];
  pendingAi?: PendingAiMessage | null;
  currentUserId: string;
  onReply: (message: ChatMessage) => void;
};

function ReplyQuote({ reply }: { reply: NonNullable<ChatMessage["replyTo"]> }) {
  return (
    <div className="mb-1.5 border-l-2 border-muted-foreground/40 pl-2 text-xs text-muted-foreground">
      <p className="font-medium">{reply.authorName}</p>
      {reply.content ? (
        <p className="line-clamp-2 whitespace-pre-wrap">{reply.content}</p>
      ) : null}
      {reply.imageUrl ? (
        <MessageImage
          src={reply.imageUrl}
          alt="Reply image"
          className="mt-1 max-h-20"
        />
      ) : null}
    </div>
  );
}

export function MessageList({
  messages,
  pendingAi,
  currentUserId,
  onReply,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const promptMessage = pendingAi
    ? messages.find((message) => message.id === pendingAi.replyToId)
    : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAi?.content]);

  if (messages.length === 0 && !pendingAi) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No messages yet. Say hello.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      {messages.map((message) => {
        const isSelf =
          message.role === "user" && message.userId === currentUserId;
        const isAssistant = message.role === "assistant";

        return (
          <article
            key={message.id}
            className={cn(
              "group flex max-w-[85%] flex-col gap-1",
              isSelf ? "ml-auto items-end" : "items-start",
            )}
          >
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{message.authorName}</p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-auto px-1 py-0 text-[0.625rem] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onReply(message)}
              >
                Reply
              </Button>
            </div>
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                isAssistant
                  ? "border bg-muted/50"
                  : isSelf
                    ? "bg-primary text-primary-foreground"
                    : "border bg-background",
              )}
            >
              {message.replyTo ? <ReplyQuote reply={message.replyTo} /> : null}
              {message.content ? (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              ) : null}
              {message.imageUrl ? (
                <MessageImage
                  src={message.imageUrl}
                  alt={`Image from ${message.authorName}`}
                />
              ) : null}
            </div>
          </article>
        );
      })}

      {pendingAi ? (
        <article className="flex max-w-[85%] flex-col items-start gap-1">
          <p className="text-xs text-muted-foreground">{pendingAi.model}</p>
          <div className="rounded-lg border bg-muted/50 px-3 py-2 text-sm">
            {promptMessage ? (
              <ReplyQuote
                reply={{
                  id: promptMessage.id,
                  authorName: promptMessage.authorName,
                  content: promptMessage.content,
                  role: promptMessage.role,
                  imageUrl: promptMessage.imageUrl,
                }}
              />
            ) : null}
            <p className="whitespace-pre-wrap break-words">
              {pendingAi.content || "Thinking…"}
            </p>
            {promptMessage?.imageUrl ? (
              <MessageImage
                src={promptMessage.imageUrl}
                alt="Prompt image"
                className="mt-2 max-h-32"
              />
            ) : null}
          </div>
        </article>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
