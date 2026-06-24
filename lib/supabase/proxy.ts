import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/set-password") ||
    pathname.startsWith("/join")
  );
}

function forwardAuthParams(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");

  if (error || errorCode) {
    const reason =
      errorCode?.toLowerCase().includes("expired") ||
      searchParams.get("error_description")?.toLowerCase().includes("expired")
        ? "expired"
        : "invalid";
    const url = request.nextUrl.clone();
    url.pathname = "/auth/error";
    url.search = "";
    url.searchParams.set("reason", reason);
    if (type) url.searchParams.set("type", type);
    return NextResponse.redirect(url);
  }

  if (code && pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  if (tokenHash && type && pathname !== "/auth/confirm") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    return NextResponse.redirect(url);
  }

  return null;
}

function isAnonymousClaim(claims: Record<string, unknown>) {
  return claims.is_anonymous === true;
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          supabaseResponse.headers.set(key, value),
        );
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const pathname = request.nextUrl.pathname;

  const authForward = forwardAuthParams(request);
  if (authForward) {
    return authForward;
  }

  if (!claims && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (claims && pathname === "/login" && !isAnonymousClaim(claims)) {
    const next = request.nextUrl.searchParams.get("next");
    const url = request.nextUrl.clone();
    url.pathname = next?.startsWith("/") ? next : "/rooms";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (claims && isAnonymousClaim(claims) && pathname === "/rooms") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("error", "guest_no_rooms");
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
