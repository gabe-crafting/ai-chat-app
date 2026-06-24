import { redirect } from "next/navigation";

import { SetPasswordForm } from "@/components/auth/set-password-form";
import { getUser, isAnonymousUser } from "@/lib/auth/session";

export default async function SetPasswordPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  if (isAnonymousUser(user)) {
    redirect("/");
  }

  return <SetPasswordForm />;
}
