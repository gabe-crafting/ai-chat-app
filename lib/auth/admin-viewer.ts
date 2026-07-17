const ADMIN_VIEWER_EMAIL = "admin1984@admin.me";

export function isAdminViewer(user: { email?: string | null } | null) {
  return user?.email?.toLowerCase() === ADMIN_VIEWER_EMAIL;
}
