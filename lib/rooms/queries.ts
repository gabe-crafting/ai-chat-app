import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type RoomWithRole = Tables<"rooms"> & {
  role: Tables<"room_participants">["role"];
};

export async function getRoomsForUser(): Promise<RoomWithRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, invite_code, model, created_at, created_by, room_participants!inner(role)")
    .eq("room_participants.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const participants = row.room_participants as { role: RoomWithRole["role"] }[];
    const role = participants[0]?.role ?? "member";
    const { room_participants: _, ...room } = row;
    return { ...room, role };
  });
}

export async function getRoomForParticipant(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: participant, error: participantError } = await supabase
    .from("room_participants")
    .select("role, can_prompt_ai")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participantError || !participant) {
    return null;
  }

  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select("id, name, invite_code, model, created_at, created_by")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return null;
  }

  return { room, participant };
}

export async function getRoomParticipants(roomId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_participants")
    .select("user_id, role, can_prompt_ai, profiles(display_name)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => {
    const profile = row.profiles as
      | { display_name: string }
      | { display_name: string }[]
      | null;
    const displayName = Array.isArray(profile)
      ? profile[0]?.display_name
      : profile?.display_name;

    return {
      userId: row.user_id,
      role: row.role,
      canPromptAi: row.can_prompt_ai,
      displayName: displayName ?? "Unknown",
    };
  });
}

export function getInviteUrl(inviteCode: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/join/${inviteCode}`;
}
