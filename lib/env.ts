function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    const value = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!value) {
      throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
    }
    return value;
  },

  /** Supports legacy anon key or newer publishable key env names. */
  get supabaseAnonKey() {
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!key) {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      );
    }

    return key;
  },

  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },

  get openRouterApiKey() {
    return required("OPENROUTER_API_KEY");
  },

  get cloudinaryCloudName() {
    return required("CLOUDINARY_CLOUD_NAME");
  },

  get cloudinaryApiKey() {
    return required("CLOUDINARY_API_KEY");
  },

  get cloudinaryApiSecret() {
    return required("CLOUDINARY_API_SECRET");
  },

  get appUrl() {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },
};
