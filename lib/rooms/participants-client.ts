import type { Participant } from "@/components/room/participant-list";
import { createClient } from "@/lib/supabase/client";

export async function fetchRoomParticipant(
  roomId: string,
  userId: string,
): Promise<Participant | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("room_participants")
    .select("user_id, role, can_prompt_ai, profiles(display_name)")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const profile = data.profiles as
    | { display_name: string }
    | { display_name: string }[]
    | null;
  const displayName = Array.isArray(profile)
    ? profile[0]?.display_name
    : profile?.display_name;

  return {
    userId: data.user_id,
    role: data.role,
    canPromptAi: data.can_prompt_ai,
    displayName: displayName ?? "Unknown",
  };
}
