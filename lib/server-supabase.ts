import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSchemaName } from "./supabase-client";

const resolveServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

const resolveProjectId = () => process.env.SUPABASE_PROJECT_ID;

export const createServerSupabaseClient = (): SupabaseClient => {
  const projectId = resolveProjectId();
  const serviceKey = resolveServiceRoleKey();
  console.log('SERVICE ROLE', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 6));
  if (!projectId) {
    throw new Error("Missing SUPABASE_PROJECT_ID env var");
  }
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY env var. Add it to .env.local (server-side only).",
    );
  }

  const url = process.env.SUPABASE_URL ?? `https://${projectId}.supabase.co`;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    db: { schema: getSchemaName() },
  });
};
