import type { UserContent } from "ai";

import { modelSupportsVision } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/rooms/message-utils";

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatModelMessageText(
  content: string,
  replyTo?: { content: string } | null,
) {
  const body = content.trim() || "(image)";

  if (!replyTo?.content.trim()) {
    return body;
  }

  return `[Replying to: "${truncate(replyTo.content.trim(), 160)}"] ${body}`;
}

export function buildUserModelContent(
  message: ChatMessage,
  modelId: string,
): UserContent {
  const text = formatModelMessageText(
    message.content,
    message.replyTo ? { content: message.replyTo.content } : null,
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
