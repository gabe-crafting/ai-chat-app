export type AuthErrorReason = "expired" | "invalid" | "misconfigured" | "unknown";

const EXPIRED_PATTERNS = ["expired", "otp_expired", "flow_state_expired"];
const INVALID_PATTERNS = ["invalid", "not found", "access_denied"];
const MISCONFIGURED_PATTERNS = [
  "code verifier",
  "both auth code and code verifier",
  "pkce",
];

export function getAuthErrorReason(error: {
  message?: string;
  code?: string;
} | null): AuthErrorReason {
  const text = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();

  if (EXPIRED_PATTERNS.some((pattern) => text.includes(pattern))) {
    return "expired";
  }

  if (MISCONFIGURED_PATTERNS.some((pattern) => text.includes(pattern))) {
    return "misconfigured";
  }

  if (INVALID_PATTERNS.some((pattern) => text.includes(pattern))) {
    return "invalid";
  }

  return "unknown";
}

export function authErrorPath(
  reason: AuthErrorReason,
  type?: string | null,
) {
  const params = new URLSearchParams({ reason });
  if (type) {
    params.set("type", type);
  }
  return `/auth/error?${params.toString()}`;
}

export function getAuthErrorContent(
  reason: AuthErrorReason,
  type?: string | null,
) {
  const isInvite = type === "invite";
  const isRecovery = type === "recovery";

  switch (reason) {
    case "expired":
      return {
        title: "Link expired",
        description: isInvite
          ? "This invite link has expired. Ask the person who invited you to send a new Supabase invite from the dashboard."
          : isRecovery
            ? "This password reset link has expired. Request a new reset link if you still need access."
            : "This sign-in or confirmation link has expired. Request a new link or sign in with your password.",
      };
    case "invalid":
      return {
        title: "Link invalid",
        description: isInvite
          ? "This invite link is invalid or was already used. Ask for a fresh invite if you still need an account."
          : "This link is invalid or was already used. Try signing in with your password instead.",
      };
    case "misconfigured":
      return {
        title: "Invite link not configured",
        description:
          "The Supabase invite email template must use token_hash (not the default ConfirmationURL). In Dashboard → Authentication → Email Templates → Invite user, set the link to: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite — then send a new invite.",
      };
    default:
      return {
        title: "Authentication error",
        description:
          "We could not complete sign-in from that link. Try again or sign in with your password.",
      };
  }
}

export function parseAuthErrorReason(value: string | undefined): AuthErrorReason {
  if (
    value === "expired" ||
    value === "invalid" ||
    value === "misconfigured" ||
    value === "unknown"
  ) {
    return value;
  }
  return "unknown";
}
