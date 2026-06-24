"use client";

import { useState, useTransition } from "react";

import { kickParticipant, setCanPromptAi } from "@/lib/rooms/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type Participant = {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  canPromptAi: boolean;
};

type ParticipantListProps = {
  roomId: string;
  participants: Participant[];
  currentUserId: string;
  isOwner: boolean;
};

export function ParticipantList({
  roomId,
  participants,
  currentUserId,
  isOwner,
}: ParticipantListProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);

  function onToggle(userId: string, checked: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await setCanPromptAi(roomId, userId, checked);
      if (result.error) {
        setError(result.error);
      }
    });
  }

  function confirmKick() {
    if (!kickTarget) return;

    const userId = kickTarget.userId;
    setError(null);
    startTransition(async () => {
      const result = await kickParticipant(roomId, userId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setKickTarget(null);
    });
  }

  return (
    <>
      <section className="space-y-3 rounded-lg border p-4">
        <div>
          <h2 className="text-sm font-medium">Participants</h2>
          <p className="text-xs text-muted-foreground">
            {isOwner
              ? "Remove guests or toggle who can prompt the AI."
              : "Who is in this room."}
          </p>
        </div>
        <ul className="divide-y">
          {participants.map((p) => {
            const isSelf = p.userId === currentUserId;
            const canKick = isOwner && p.role !== "owner";
            const canToggle = isOwner && p.role !== "owner";

            return (
              <li
                key={p.userId}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  {isOwner ? (
                    canKick ? (
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                              aria-label={`Kick ${p.displayName}`}
                              disabled={pending}
                              onClick={() => setKickTarget(p)}
                            />
                          }
                        >
                          ×
                        </TooltipTrigger>
                        <TooltipContent>Kick user</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="size-5 shrink-0" aria-hidden />
                    )
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {p.displayName}
                      {isSelf ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {p.role}
                      {p.canPromptAi ? " · can use AI" : ""}
                    </p>
                  </div>
                </div>
                {canToggle ? (
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`ai-${p.userId}`} className="text-xs">
                      AI
                    </Label>
                    <Switch
                      id={`ai-${p.userId}`}
                      checked={p.canPromptAi}
                      disabled={pending}
                      onCheckedChange={(checked) => onToggle(p.userId, checked)}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
        {error ? (
          <p className="text-xs text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <Dialog
        open={kickTarget !== null}
        onOpenChange={(open) => {
          if (!open && !pending) {
            setKickTarget(null);
          }
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Kick user?</DialogTitle>
            <DialogDescription>
              {kickTarget
                ? `Remove ${kickTarget.displayName} from this room? They can rejoin with the invite link.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setKickTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={confirmKick}
            >
              {pending ? "Removing…" : "Kick user"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
