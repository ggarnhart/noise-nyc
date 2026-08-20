import { createClient } from "@supabase/supabase-js";

/*
  These defaults point at the project's own Supabase instance so the app
  works with zero configuration. Both values are *publishable* — they ship
  in client bundles on every Supabase app and are safe to commit. All data
  access is governed by Row Level Security policies in the database.

  Override with env vars to point at your own instance.
*/
const SUPABASE_URL =
  process.env.SUPABASE_URL ?? "https://hdcdxblkpxbhtozodcul.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_24uElyGmM68jJy0_VFB1MA_gAePwR-U";

export function supabase() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
