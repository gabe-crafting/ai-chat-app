import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getUser, isAnonymousUser } from "@/lib/auth/session";

type HomePageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await getUser();
  const params = await searchParams;

  const guestMessage =
    params.error === "guest_no_rooms"
      ? "Guest accounts can only join rooms via an invite link."
      : params.error === "kicked"
        ? "You were removed from the room by the owner."
        : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">AI Chat Rooms</h1>
        <p className="text-sm text-muted-foreground">
          Multi-user chat rooms with shared AI streaming. Full accounts are
          invite-only; room guests join via a link.
        </p>
      </div>

      {guestMessage ? (
        <p className="text-sm text-destructive" role="alert">
          {guestMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {user && !isAnonymousUser(user) ? (
          <Button render={<Link href="/rooms" />} nativeButton={false}>
            Go to rooms
          </Button>
        ) : (
          <Button render={<Link href="/login" />} nativeButton={false}>
            Sign in
          </Button>
        )}
      </div>

      {!user ? (
        <p className="max-w-sm text-xs text-muted-foreground">
          Have a room invite link? Open it directly — you will be asked for a
          display name to join as a guest.
        </p>
      ) : null}
    </div>
  );
}
