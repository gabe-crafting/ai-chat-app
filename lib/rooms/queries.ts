import { isAdminViewer } from "@/lib/auth/admin-viewer";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type RoomWithRole = Tables<"rooms"> & {
  role?: Tables<"room_participants">["role"];
  readOnly?: boolean;
};

export type RoomPageAccess = {
  room: Pick<
    Tables<"rooms">,
    | "id"
    | "name"
    | "invite_code"
    | "model"
    | "created_at"
    | "created_by"
    | "ai_system_prompt"
    | "ai_reasoning_effort"
  >;
  participant: Pick<
    Tables<"room_participants">,
    "role" | "can_prompt_ai"
  >;
  readOnly: boolean;
  isOwner: boolean;
};

export async function getRoomsForUser(): Promise<RoomWithRole[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  if (isAdminViewer(user)) {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("rooms")
      .select("id, name, invite_code, model, created_at, created_by, ai_system_prompt, ai_reasoning_effort")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[rooms/getRoomsForUser/admin]", error);
      return [];
    }

    return (data ?? []).map((room) => ({ ...room, readOnly: true }));
  }

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, invite_code, model, created_at, created_by, ai_system_prompt, ai_reasoning_effort, room_participants!inner(role)")
    .eq("room_participants.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[rooms/getRoomsForUser]", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const participants = row.room_participants as { role: RoomWithRole["role"] }[];
    const role = participants[0]?.role ?? "member";
    const { room_participants: _, ...room } = row;
    return { ...room, role };
  });
}

export async function getRoomPageAccess(
  roomId: string,
): Promise<RoomPageAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  if (isAdminViewer(user)) {
    const admin = createAdminClient();
    const { data: room, error } = await admin
      .from("rooms")
      .select("id, name, invite_code, model, created_at, created_by, ai_system_prompt, ai_reasoning_effort")
      .eq("id", roomId)
      .maybeSingle();

    if (error || !room) {
      return null;
    }

    return {
      room,
      participant: { role: "member", can_prompt_ai: false },
      readOnly: true,
      isOwner: false,
    };
  }

  const data = await getRoomForParticipant(roomId);
  if (!data) {
    return null;
  }

  return {
    room: data.room,
    participant: data.participant,
    readOnly: false,
    isOwner: data.participant.role === "owner",
  };
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
    .select("id, name, invite_code, model, created_at, created_by, ai_system_prompt, ai_reasoning_effort")
    .eq("id", roomId)
    .single();

  if (roomError || !room) {
    return null;
  }

  return { room, participant };
}

export async function getRoomParticipants(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const client = isAdminViewer(user) ? createAdminClient() : supabase;

  const { data, error } = await client
    .from("room_participants")
    .select("user_id, role, can_prompt_ai, profiles(display_name)")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[rooms/getRoomParticipants]", error);
    return [];
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
