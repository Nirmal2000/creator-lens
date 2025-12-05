import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SCHEMA = process.env.SUPABASE_SCHEMA ?? "sm_data";

const resolveProjectId = () =>
  process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_ID;

const resolveAnonKey = () =>
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

const resolveUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (directUrl) return directUrl;
  const projectId = resolveProjectId();
  if (!projectId) {
    throw new Error("Missing SUPABASE_PROJECT_ID (or NEXT_PUBLIC_SUPABASE_PROJECT_ID)");
  }
  return `https://${projectId}.supabase.co`;
};

export const createBrowserSupabaseClient = (): SupabaseClient => {
  const anonKey = resolveAnonKey();
  if (!anonKey) {
    throw new Error("Missing SUPABASE_ANON_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)");
  }

  return createClient(resolveUrl(), anonKey, {
    db: { schema: DEFAULT_SCHEMA },
  });
};

export const getSchemaName = () => DEFAULT_SCHEMA;
