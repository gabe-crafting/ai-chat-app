import { createClient } from "@/lib/supabase/client";

export async function signInAsGuest(displayName: string) {
  const name = displayName.trim();

  if (!name) {
    throw new Error("Display name is required.");
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInAnonymously({
    options: {
      data: { display_name: name },
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error("Failed to create guest session.");
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      display_name: name,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    throw profileError;
  }

  return data.user;
}
