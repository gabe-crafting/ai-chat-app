"use client";

import type { ReactNode } from "react";

import type { Participant } from "@/components/room/participant-list";
import { ParticipantList } from "@/components/room/participant-list";
import { RoomChat } from "@/components/room/room-chat";
import type { ChatMessage } from "@/lib/rooms/messages";
import { useRoomParticipants } from "@/lib/rooms/use-room-participants";

type RoomLiveProps = {
  roomId: string;
  userId: string;
  roomModel: string;
  initialParticipants: Participant[];
  initialMessages: ChatMessage[];
  canPromptAi: boolean;
  isOwner: boolean;
  inviteSection?: ReactNode;
};

export function RoomLive({
  roomId,
  userId,
  roomModel,
  initialParticipants,
  initialMessages,
  canPromptAi,
  isOwner,
  inviteSection,
}: RoomLiveProps) {
  const { participants, authorNames } = useRoomParticipants(
    roomId,
    initialParticipants,
    userId,
  );

  return (
    <div className="flex flex-col gap-6">
      <RoomChat
        roomId={roomId}
        userId={userId}
        roomModel={roomModel}
        initialMessages={initialMessages}
        canPromptAi={canPromptAi}
        authorNames={authorNames}
      />

      {inviteSection}

      <ParticipantList
        roomId={roomId}
        participants={participants}
        currentUserId={userId}
        isOwner={isOwner}
      />
    </div>
  );
}
