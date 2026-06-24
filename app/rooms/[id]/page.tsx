import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CopyInviteLink } from "@/components/room/copy-invite-link";
import { RoomLive } from "@/components/room/room-live";
import { Button } from "@/components/ui/button";
import { getModelLabel, normalizeModelId } from "@/lib/ai/models";
import { getUser } from "@/lib/auth/session";
import { getRoomMessages } from "@/lib/rooms/messages";
import {
  getInviteUrl,
  getRoomForParticipant,
  getRoomParticipants,
} from "@/lib/rooms/queries";

type RoomPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RoomPage({ params }: RoomPageProps) {
  const { id } = await params;
  const user = await getUser();

  if (!user) {
    redirect(`/login?next=/rooms/${id}`);
  }

  const data = await getRoomForParticipant(id);

  if (!data) {
    notFound();
  }

  const { room, participant } = data;
  const [participants, messages] = await Promise.all([
    getRoomParticipants(id),
    getRoomMessages(id),
  ]);
  const inviteUrl = getInviteUrl(room.invite_code);
  const isOwner = participant.role === "owner";

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <div className="space-y-1">
        <Button
          render={<Link href={user.is_anonymous ? "/" : "/rooms"} />}
          variant="ghost"
          size="sm"
          nativeButton={false}
          className="-ml-2 h-auto px-2 py-1"
        >
          ← Back
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">{room.name}</h1>
        <p className="text-sm text-muted-foreground">
          Model: {getModelLabel(normalizeModelId(room.model))}
          {isOwner ? " · Owner" : " · Member"}
        </p>
      </div>

      <RoomLive
        roomId={id}
        userId={user.id}
        roomModel={room.model}
        initialParticipants={participants}
        initialMessages={messages}
        canPromptAi={participant.can_prompt_ai}
        isOwner={isOwner}
        inviteSection={
          isOwner ? (
            <section className="space-y-2 rounded-lg border p-4">
              <h2 className="text-sm font-medium">Invite link</h2>
              <CopyInviteLink inviteUrl={inviteUrl} />
            </section>
          ) : null
        }
      />
    </div>
  );
}
