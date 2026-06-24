import { createClient } from "@/lib/supabase/server";

import {
  enrichReplyAuthors,
  mapMessageRow,
  MESSAGE_SELECT,
  type ChatMessage,
} from "./message-utils";

export type { ChatMessage } from "./message-utils";

export async function getRoomMessages(roomId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const messages = (data ?? []).map((row) => mapMessageRow(row));
  return enrichReplyAuthors(messages);
}
