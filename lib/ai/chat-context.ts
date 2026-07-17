import type { ModelMessage } from "ai";

import { buildUserModelContent } from "@/lib/ai/message-content";
import type { ChatMessage } from "@/lib/rooms/message-utils";

export function messagesToModelHistory(
  messages: ChatMessage[],
  modelId: string,
): ModelMessage[] {
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
      historyMessages.push({
        role: "assistant",
        content: contextMessage.content,
      });
      continue;
    }

    if (contextMessage.role === "user") {
      historyMessages.push({
        role: "user",
        content: buildUserModelContent(contextMessage, modelId),
      });
      continue;
    }

    if (contextMessage.role === "system" && contextMessage.content.trim()) {
      historyMessages.push({ role: "user", content: contextMessage.content });
    }
  }

  return historyMessages;
}
