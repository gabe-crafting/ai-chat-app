import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getUser } from "@/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    reason?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getUser();
  const params = await searchParams;

  if (user && !user.is_anonymous) {
    redirect(params.next?.startsWith("/") ? params.next : "/rooms");
  }

  const reasonMessage =
    params.reason === "session_expired"
      ? "Your session expired or you signed in on another device. Please sign in again."
      : undefined;

  return (
    <LoginForm
      next={params.next?.startsWith("/") ? params.next : "/rooms"}
      error={params.error ?? reasonMessage}
    />
  );
}
