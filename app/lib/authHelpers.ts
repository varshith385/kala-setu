/**
 * Determines whether an authenticated user is an authorized administrator.
 *
 * Multi-layer Authorization Evaluation:
 * 1. Database profile has role = 'admin'.
 * 2. Unconfirmed emails are strictly rejected (prevents rogue self-signup without inbox ownership).
 * 3. Server-configured ADMIN_EMAILS environment variable.
 * 4. Staging-only designated administrative email (active only when connected to staging project).
 * 5. Server-configured ADMIN_USER_IDS environment variable.
 */
export function isAuthorizedAdmin(
  user: { id: string; email?: string | null; email_confirmed_at?: string | null },
  profileRole?: string | null
): boolean {
  if (profileRole === "admin") return true;

  // Enforce confirmed email before trusting email-based administrative allowlists
  if (user.email && user.email_confirmed_at) {
    const emailLower = user.email.toLowerCase();

    // 1. Explicitly configured server environment allowlist
    const configuredAdmins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (configuredAdmins.includes(emailLower)) {
      return true;
    }

    // 2. Staging-only test admin accounts (active only if Supabase URL matches staging project)
    const isStagingEnv = process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("tgloneuszflwxzdxzujj");
    if (isStagingEnv) {
      const stagingAdmins = ["admin@kalasetu.art", "staging.admin@kalasetu.art"];
      if (stagingAdmins.includes(emailLower)) {
        return true;
      }
    }
  }

  // 3. User ID allowlist (not dependent on email)
  const adminUserIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (adminUserIds.includes(user.id)) {
    return true;
  }

  return false;
}
