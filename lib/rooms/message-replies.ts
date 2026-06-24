import { createClient } from "@/lib/supabase/server";

import {
  attachReplyPreview,
  mapMessageRow,
  MESSAGE_SELECT,
  type ChatMessage,
} from "./message-utils";

export async function fetchMessageById(
  messageId: string,
  authorNames: Record<string, string> = {},
): Promise<ChatMessage | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("id", messageId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapMessageRow(data, authorNames);
}

export async function mapMessageWithReply(
  row: Parameters<typeof mapMessageRow>[0],
  authorNames: Record<string, string> = {},
): Promise<ChatMessage> {
  const message = mapMessageRow(row, authorNames);

  if (!message.replyToId) {
    return message;
  }

  const parent = await fetchMessageById(message.replyToId, authorNames);
  return attachReplyPreview(message, parent);
}
