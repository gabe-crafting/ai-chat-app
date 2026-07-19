import type { UserContent } from "ai";

import { modelSupportsVision } from "@/lib/ai/models";
import type { ChatMessage } from "@/lib/rooms/message-utils";

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

export function formatModelMessageText(
  content: string,
  replyTo?: { content: string; authorName?: string } | null,
  options?: { labelSpeaker?: boolean; speakerName?: string },
) {
  let body = content.trim() || "(image)";

  if (options?.labelSpeaker && options.speakerName) {
    body = `[${options.speakerName}]: ${body}`;
  }

  if (!replyTo?.content.trim()) {
    return body;
  }

  const replyAuthor = replyTo.authorName?.trim();
  const replyLabel =
    options?.labelSpeaker && replyAuthor
      ? `${replyAuthor}: "${truncate(replyTo.content.trim(), 160)}"`
      : `"${truncate(replyTo.content.trim(), 160)}"`;

  return `[Replying to: ${replyLabel}] ${body}`;
}

export function buildUserModelContent(
  message: ChatMessage,
  modelId: string,
  options?: { labelSpeaker?: boolean },
): UserContent {
  const text = formatModelMessageText(
    message.content,
    message.replyTo
      ? {
          content: message.replyTo.content,
          authorName: message.replyTo.authorName,
        }
      : null,
    {
      labelSpeaker: options?.labelSpeaker,
      speakerName: message.authorName,
    },
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
