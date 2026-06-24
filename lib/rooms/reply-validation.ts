import { createClient } from "@/lib/supabase/server";

export async function assertReplyTarget(
  roomId: string,
  replyToId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, room_id")
    .eq("id", replyToId)
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data || data.room_id !== roomId) {
    return { error: "The message you are replying to was not found." };
  }

  return {};
}
