import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateRoomForm } from "@/components/room/create-room-form";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";
import { getUser, isAnonymousUser } from "@/lib/auth/session";
import { getRoomsForUser } from "@/lib/rooms/queries";

export default async function RoomsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (isAnonymousUser(user)) {
    redirect("/?error=guest_no_rooms");
  }

  const rooms = await getRoomsForUser();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your rooms</h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">Create a room</h2>
        <CreateRoomForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium">
          {rooms.length === 0 ? "No rooms yet" : "Your rooms"}
        </h2>
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create a room above, then share the invite link with others.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {rooms.map((room) => (
              <li key={room.id}>
                <Link
                  href={`/rooms/${room.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {room.role}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
