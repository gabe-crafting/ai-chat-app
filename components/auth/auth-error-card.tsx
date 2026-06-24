import Link from "next/link";

import {
  getAuthErrorContent,
  parseAuthErrorReason,
  type AuthErrorReason,
} from "@/lib/auth/errors";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AuthErrorCardProps = {
  reason: AuthErrorReason;
  type?: string | null;
};

export function AuthErrorCard({ reason, type }: AuthErrorCardProps) {
  const { title, description } = getAuthErrorContent(reason, type);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <Button render={<Link href="/login" />} nativeButton={false}>
          Sign in
        </Button>
        <Button
          render={<Link href="/" />}
          variant="outline"
          nativeButton={false}
        >
          Back home
        </Button>
      </CardFooter>
    </Card>
  );
}

type AuthErrorPageContentProps = {
  searchParams: Promise<{
    reason?: string;
    type?: string;
  }>;
};

export async function AuthErrorPageContent({
  searchParams,
}: AuthErrorPageContentProps) {
  const params = await searchParams;
  const reason = parseAuthErrorReason(params.reason);

  return <AuthErrorCard reason={reason} type={params.type} />;
}
