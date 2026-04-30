import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getAuthOptions } from "./auth";
import { prisma } from "./prisma";

export async function requireAdmin() {
  const session = await getServerSession(getAuthOptions());
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
