import Link from "next/link";
import { redirect } from "next/navigation";

import { JoinRoomForm } from "@/components/room/join-room-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getUser } from "@/lib/auth/session";
import { joinRoom } from "@/lib/rooms/actions";

type JoinPageProps = {
  params: Promise<{ invite_code: string }>;
};

export default async function JoinPage({ params }: JoinPageProps) {
  const { invite_code: inviteCode } = await params;
  const user = await getUser();

  if (user) {
    const result = await joinRoom(inviteCode);

    if ("roomId" in result) {
      redirect(`/rooms/${result.roomId}`);
    }

    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Could not join room</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex gap-2">
            <Button render={<Link href="/" />} variant="outline" nativeButton={false}>
              Home
            </Button>
            {user.is_anonymous ? null : (
              <Button render={<Link href="/rooms" />} nativeButton={false}>
                Your rooms
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <JoinRoomForm inviteCode={inviteCode} />
    </div>
  );
}
