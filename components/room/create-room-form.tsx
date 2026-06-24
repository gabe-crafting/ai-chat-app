"use client";

import { useActionState } from "react";

import { createRoom, type RoomActionState } from "@/lib/rooms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: RoomActionState = {};

export function CreateRoomForm() {
  const [state, formAction, pending] = useActionState(
    createRoom,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="room-name" className="sr-only">
            Room name
          </Label>
          <Input
            id="room-name"
            name="name"
            placeholder="New room name"
            required
            disabled={pending}
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create room"}
        </Button>
      </div>

      {state.error ? (
        <p className="text-xs text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
