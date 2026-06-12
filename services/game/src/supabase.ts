import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — server only, bypasses RLS (invariant 6:
 * the server is the only writer of blocks/reports/events and the only
 * reader of auth tokens). Null when env is missing (local dev): every
 * Supabase-backed feature then degrades to a no-op.
 */
const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabase: SupabaseClient | null =
  url && serviceRoleKey
    ? createClient(url, serviceRoleKey, { auth: { persistSession: false } })
    : null;

if (supabase) console.log("supabase connected (service role)");
