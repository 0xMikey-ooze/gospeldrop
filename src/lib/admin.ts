/**
 * Canonical admin authentication helper.
 *
 * Uses the `role` field on the User model as the single source of truth
 * for admin status. The session JWT also carries the role so we can avoid
 * an extra DB round-trip in most cases, falling back to a DB check when the
 * session role is absent (e.g. tokens minted before this change).
 */
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { NextResponse } from "next/server";

type AdminCheckResult =
  | { session: Awaited<ReturnType<typeof getServerSession>>; error?: never }
  | { error: NextResponse; session?: never };

export async function requireAdmin(): Promise<AdminCheckResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const role = (session.user as { role?: string }).role;
  if (role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session };
}
