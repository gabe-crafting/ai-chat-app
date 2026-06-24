"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAuthErrorReason } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/client";

export default function HashCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    async function complete() {
      const supabase = createClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        router.replace(
          `/auth/error?reason=${getAuthErrorReason(error)}&type=invite`,
        );
        return;
      }

      if (data.session) {
        router.replace("/set-password");
        return;
      }

      setMessage("Could not complete sign-in from this link.");
      router.replace("/auth/error?reason=invalid&type=invite");
    }

    void complete();
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
