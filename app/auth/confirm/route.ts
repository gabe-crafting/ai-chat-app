import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { authErrorPath, getAuthErrorReason } from "@/lib/auth/errors";
import { createClient } from "@/lib/supabase/server";

function defaultNextPath(type: EmailOtpType | null) {
  if (type === "invite" || type === "recovery") {
    return "/set-password";
  }

  return "/rooms";
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname =
    nextParam?.startsWith("/") ? nextParam : defaultNextPath(type);
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("next");

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(redirectTo);
    }

    return NextResponse.redirect(
      new URL(authErrorPath(getAuthErrorReason(error), type), request.url),
    );
  }

  return NextResponse.redirect(
    new URL(authErrorPath("invalid", type), request.url),
  );
}
