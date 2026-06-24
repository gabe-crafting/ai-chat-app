import type { UserContent } from "ai";

import { modelSupportsVision } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/rooms/message-utils";

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatUserLine(
  displayName: string,
  content: string,
  replyTo?: { authorName: string; content: string } | null,
) {
  if (!replyTo) {
    return `${displayName}: ${content}`;
  }

  return (
    `${displayName} (replying to ${replyTo.authorName}: "${truncate(replyTo.content, 160)}"): ${content}`
  );
}

export function buildUserModelContent(
  message: ChatMessage,
  modelId: string,
): UserContent {
  const text = formatUserLine(
    message.authorName,
    message.content || "(image)",
    message.replyTo,
  );

  if (!message.imageUrl) {
    return text;
  }

  if (!modelSupportsVision(modelId)) {
    return text;
  }

  return [
    { type: "text", text },
    { type: "image", image: message.imageUrl },
  ];
}
