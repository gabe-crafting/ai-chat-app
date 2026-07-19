import type { ModelMessage } from "ai";

import { buildUserModelContent } from "@/lib/ai/message-content";
import type { ChatMessage } from "@/lib/rooms/message-utils";

export function messagesToModelHistory(
  messages: ChatMessage[],
  modelId: string,
  options?: { labelSpeakers?: boolean },
): ModelMessage[] {
  const labelSpeakers = options?.labelSpeakers ?? false;
  const hiddenIds = new Set(
    messages.filter((message) => message.hiddenFromAi).map((message) => message.id),
  );
  const historyMessages: ModelMessage[] = [];

  for (const message of messages) {
    if (message.hiddenFromAi) {
      continue;
    }

    const contextMessage =
      message.replyToId && hiddenIds.has(message.replyToId)
        ? { ...message, replyTo: null }
        : message;

    if (contextMessage.role === "assistant") {
      const content = labelSpeakers
        ? `[${contextMessage.authorName}]: ${contextMessage.content}`
        : contextMessage.content;
      historyMessages.push({
        role: "assistant",
        content,
      });
      continue;
    }

    if (contextMessage.role === "user") {
      historyMessages.push({
        role: "user",
        content: buildUserModelContent(contextMessage, modelId, {
          labelSpeaker: labelSpeakers,
        }),
      });
      continue;
    }

    if (contextMessage.role === "system" && contextMessage.content.trim()) {
      const content = labelSpeakers
        ? `[System]: ${contextMessage.content}`
        : contextMessage.content;
      historyMessages.push({ role: "user", content });
    }
  }

  return historyMessages;
}
