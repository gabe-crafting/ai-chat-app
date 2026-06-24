"use client";

import { useEffect } from "react";

/**
 * Catches auth params on any page (especially `/`) and forwards to the right
 * handler. Server proxy only sees query strings; implicit/hash redirects from
 * Supabase must be handled in the browser.
 */
export function AuthLinkHandler() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const { pathname, search, hash } = url;
    const params = url.searchParams;

    const error = params.get("error");
    const errorCode = params.get("error_code") ?? params.get("error_description");

    if (error || errorCode) {
      const reason =
        errorCode?.toLowerCase().includes("expired") ||
        params.get("error_description")?.toLowerCase().includes("expired")
          ? "expired"
          : "invalid";
      const type = params.get("type");
      const query = new URLSearchParams({ reason });
      if (type) query.set("type", type);
      window.location.replace(`/auth/error?${query.toString()}`);
      return;
    }

    if (params.get("code") && pathname !== "/auth/callback") {
      window.location.replace(`/auth/callback${search}`);
      return;
    }

    if (
      params.get("token_hash") &&
      params.get("type") &&
      pathname !== "/auth/confirm"
    ) {
      window.location.replace(`/auth/confirm${search}`);
      return;
    }

    const hashBody = hash.startsWith("#") ? hash.slice(1) : hash;
    if (
      hashBody &&
      (hashBody.includes("access_token=") ||
        hashBody.includes("error=") ||
        hashBody.includes("error_code=")) &&
      pathname !== "/auth/hash-callback"
    ) {
      window.location.replace(`/auth/hash-callback${hash}`);
    }
  }, []);

  return null;
}
