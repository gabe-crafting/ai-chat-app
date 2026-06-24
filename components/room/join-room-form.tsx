"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signInAsGuest } from "@/lib/auth/guest";
import { joinRoom } from "@/lib/rooms/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type JoinRoomFormProps = {
  inviteCode: string;
};

export function JoinRoomForm({ inviteCode }: JoinRoomFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function joinExistingSession() {
    const result = await joinRoom(inviteCode);

    if ("error" in result) {
      throw new Error(result.error);
    }

    router.push(`/rooms/${result.roomId}`);
    router.refresh();
  }

  async function handleGuestJoin(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await signInAsGuest(displayName);
      await joinExistingSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join room.");
      setPending(false);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Join chat</CardTitle>
        <CardDescription>
          Enter a display name to join as a guest. You can chat with others;
          AI access is controlled by the room owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleGuestJoin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Your name"
              required
              minLength={1}
              maxLength={40}
              disabled={pending}
              autoComplete="nickname"
            />
          </div>

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Joining…" : "Join room"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
