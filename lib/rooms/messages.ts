import { isAdminViewer } from "@/lib/auth/admin-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const client = isAdminViewer(user) ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("messages")
    .select(MESSAGE_SELECT)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[rooms/getRoomMessages]", error);
    return [];
  }

  const messages = (data ?? []).map((row) => mapMessageRow(row));
  return enrichReplyAuthors(messages);
}
