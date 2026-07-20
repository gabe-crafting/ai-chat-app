"use client";

import { useRef } from "react";

import { CopyTextButton } from "@/components/room/copy-text-button";
import { MessageImage } from "@/components/room/image-attachment";
import { MarkdownContent } from "@/components/room/markdown-content";
import type { PendingAiMessage } from "@/lib/rooms/ai-stream";
import type { ChatMessage } from "@/lib/rooms/message-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MessageListProps = {
  messages: ChatMessage[];
  pendingAi?: PendingAiMessage | null;
  currentUserId: string;
  onReply: (message: ChatMessage) => void;
  readOnly?: boolean;
  canManageAiContext?: boolean;
  bottomRef?: React.RefObject<HTMLDivElement | null>;
  onHiddenFromAiChange?: (
    messageId: string,
    hiddenFromAi: boolean,
  ) => Promise<void>;
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
  readOnly = false,
  canManageAiContext = false,
  bottomRef: bottomRefProp,
  onHiddenFromAiChange,
}: MessageListProps) {
  const localBottomRef = useRef<HTMLDivElement>(null);
  const bottomRef = bottomRefProp ?? localBottomRef;
  const promptMessage = pendingAi
    ? messages.find((message) => message.id === pendingAi.replyToId)
    : null;

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
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
        {messages.map((message) => {
          const isSelf =
            message.role === "user" && message.userId === currentUserId;
          const isAssistant = message.role === "assistant";

          return (
            <article
              key={message.id}
              className={cn(
                "flex max-w-[85%] flex-col gap-1",
                isSelf ? "ml-auto items-end" : "items-start",
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-xs text-muted-foreground">
                  {message.authorName}
                </p>
                {isAssistant && message.content ? (
                  <CopyTextButton
                    text={message.content}
                    className="h-auto px-1 py-0 text-[0.625rem] text-muted-foreground"
                  />
                ) : null}
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="h-auto px-1 py-0 text-[0.625rem] text-muted-foreground"
                    onClick={() => onReply(message)}
                  >
                    Reply
                  </Button>
                ) : null}
                {canManageAiContext && onHiddenFromAiChange ? (
                  <label className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={message.hiddenFromAi}
                      onChange={(event) => {
                        void onHiddenFromAiChange(
                          message.id,
                          event.target.checked,
                        );
                      }}
                      className="size-3 rounded border"
                    />
                    Hide from AI
                  </label>
                ) : null}
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
                {message.replyTo ? (
                  <ReplyQuote reply={message.replyTo} />
                ) : null}
                {message.content ? (
                  isAssistant ? (
                    <MarkdownContent content={message.content} />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  )
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
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">{pendingAi.model}</p>
              {pendingAi.content ? (
                <CopyTextButton
                  text={pendingAi.content}
                  className="h-auto px-1 py-0 text-[0.625rem] text-muted-foreground"
                />
              ) : null}
            </div>
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
              {pendingAi.content ? (
                <MarkdownContent content={pendingAi.content} />
              ) : (
                <p className="text-muted-foreground">Thinking…</p>
              )}
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
    </div>
  );
}
