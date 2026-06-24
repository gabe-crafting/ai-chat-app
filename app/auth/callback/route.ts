import { NextResponse } from "next/server";

import { authErrorPath, getAuthErrorReason } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

function needsPasswordSetup(type: string | null) {
  return type === "invite" || type === "recovery";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const nextParam = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      let destination = "/rooms";

      if (nextParam?.startsWith("/")) {
        destination = nextParam;
      } else if (needsPasswordSetup(type) || !type) {
        destination = "/set-password";
      }

      return NextResponse.redirect(`${origin}${destination}`);
    }

    return NextResponse.redirect(
      `${origin}${authErrorPath(getAuthErrorReason(error), type)}`,
    );
  }

  return NextResponse.redirect(`${origin}${authErrorPath("invalid", type)}`);
}
