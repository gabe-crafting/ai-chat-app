import { getModelLabel } from "@/lib/ai/models";

export type MessageReplyPreview = {
  id: string;
  authorName: string;
  content: string;
  role: "user" | "assistant" | "system";
  imageUrl: string | null;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  imageUrl: string | null;
  createdAt: string;
  authorName: string;
  replyToId: string | null;
  replyTo: MessageReplyPreview | null;
};

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  model: string | null;
  image_url?: string | null;
  created_at: string;
  reply_to_id?: string | null;
  profiles?:
    | { display_name: string }
    | { display_name: string }[]
    | null;
};

export const MESSAGE_SELECT =
  "id, room_id, user_id, role, content, model, image_url, created_at, reply_to_id, profiles(display_name)";

function authorNameForRow(
  row: {
    role: "user" | "assistant" | "system";
    model: string | null;
    user_id: string | null;
    profiles?:
      | { display_name: string }
      | { display_name: string }[]
      | null;
  },
  authorNames: Record<string, string>,
): string {
  const profile = row.profiles;
  const displayName = Array.isArray(profile)
    ? profile[0]?.display_name
    : profile?.display_name;

  if (row.role === "assistant") {
    return row.model ? getModelLabel(row.model) : "Assistant";
  }

  if (row.role === "system") {
    return "System";
  }

  return (
    displayName ??
    (row.user_id ? authorNames[row.user_id] : null) ??
    "Unknown"
  );
}

export function toReplyPreview(message: ChatMessage): MessageReplyPreview {
  return {
    id: message.id,
    authorName: message.authorName,
    content: message.content,
    role: message.role,
    imageUrl: message.imageUrl,
  };
}

export function attachReplyPreview(
  message: ChatMessage,
  parent: ChatMessage | null,
): ChatMessage {
  if (!message.replyToId || !parent) {
    return message;
  }

  return {
    ...message,
    replyTo: toReplyPreview(parent),
  };
}

export function mapMessageRow(
  row: MessageRow,
  authorNames: Record<string, string> = {},
): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    role: row.role,
    content: row.content,
    model: row.model,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    authorName: authorNameForRow(row, authorNames),
    replyToId: row.reply_to_id ?? null,
    replyTo: null,
  };
}

export function enrichReplyAuthors(messages: ChatMessage[]): ChatMessage[] {
  const byId = new Map(messages.map((message) => [message.id, message]));

  return messages.map((message) => {
    if (!message.replyToId) {
      return message;
    }

    const parent = byId.get(message.replyToId);
    if (!parent) {
      return message;
    }

    return attachReplyPreview(message, parent);
  });
}
