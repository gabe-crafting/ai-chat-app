"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { Participant } from "@/components/room/participant-list";
import { fetchRoomParticipant } from "@/lib/rooms/participants-client";
import { createClient } from "@/lib/supabase/client";

export function useRoomParticipants(
  roomId: string,
  initialParticipants: Participant[],
  currentUserId: string,
) {
  const router = useRouter();
  const [participants, setParticipants] = useState(initialParticipants);

  const authorNames = useMemo(
    () => Object.fromEntries(participants.map((p) => [p.userId, p.displayName])),
    [participants],
  );

  useEffect(() => {
    setParticipants(initialParticipants);
  }, [initialParticipants]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${roomId}`)
      .on("broadcast", { event: "participants_changed" }, ({ payload }) => {
        const { userId } = payload as { userId: string };

        void fetchRoomParticipant(roomId, userId).then((participant) => {
          if (!participant) return;

          setParticipants((current) => {
            if (current.some((entry) => entry.userId === userId)) {
              return current.map((entry) =>
                entry.userId === userId ? participant : entry,
              );
            }
            return [...current, participant];
          });
        });
      })
      .on("broadcast", { event: "participant_kicked" }, ({ payload }) => {
        const { userId } = payload as { userId: string };

        setParticipants((current) =>
          current.filter((entry) => entry.userId !== userId),
        );

        if (userId === currentUserId) {
          router.push("/?error=kicked");
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, currentUserId, router]);

  return { participants, authorNames };
}
