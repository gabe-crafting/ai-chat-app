"use client";

import { useEffect } from "react";

import { createClient } from "@/lib/supabase/client";

const PROTECTED_PREFIXES = ["/rooms"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function AuthSessionListener() {
  useEffect(() => {
    const supabase = createClient();

    async function ensureSession() {
      const pathname = window.location.pathname;
      if (!isProtectedPath(pathname)) {
        return;
      }

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        await supabase.auth.signOut();
        window.location.href = "/login?reason=session_expired";
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
        void ensureSession();
      }
    });

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void ensureSession();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
