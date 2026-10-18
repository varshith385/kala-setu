import "server-only";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn("NEXT_PUBLIC_SUPABASE_URL is not set in environment.");
}

if (!supabaseServiceRoleKey) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is not set in environment. Server-side operations will fail if unconfigured.");
}

/**
 * Server-only Supabase client with Service Role privileges.
 * WARNING: Never import this client into client-side ("use client") components.
 */
export const supabaseAdmin = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceRoleKey || "placeholder-service-role-key",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Verifies Supabase Bearer access token from the Authorization header
 * and returns the authenticated user object.
 */
export async function authenticateServerRequest(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, error: "Missing or malformed Authorization header" };
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return { user: null, error: "Empty access token" };
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return { user: null, error: error?.message || "Invalid or expired session token" };
    }

    return { user: data.user, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to authenticate session";
    return { user: null, error: message };
  }
}

export { isAuthorizedAdmin } from "./authHelpers";

