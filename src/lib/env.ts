// Public Supabase settings. Safe to expose to the browser (RLS protects the data).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

// "development" | "preview" | "production". Guards real-data features (outbound email, real documents).
export const APP_ENV = process.env.APP_ENV ?? "development";
