import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/** Server-only client that bypasses RLS. Use in route handlers, never in the browser. */
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
