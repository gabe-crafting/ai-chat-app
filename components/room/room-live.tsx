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
  aiSystemPrompt?: string;
  aiReasoningEffort?: string;
  readOnly?: boolean;
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
  aiSystemPrompt = "",
  aiReasoningEffort = "off",
  readOnly = false,
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
        isOwner={isOwner}
        aiSystemPrompt={aiSystemPrompt}
        aiReasoningEffort={aiReasoningEffort}
        authorNames={authorNames}
        readOnly={readOnly}
      />

      {!readOnly ? inviteSection : null}

      {!readOnly ? (
        <ParticipantList
          roomId={roomId}
          participants={participants}
          currentUserId={userId}
          isOwner={isOwner}
        />
      ) : null}
    </div>
  );
}
