import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const donations = await prisma.donation.findMany({
      where: { userId: (session.user as any).id },
      include: { bibleDrops: { include: { address: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(donations);
  } catch {
    return NextResponse.json({ error: "Failed to fetch donations" }, { status: 500 });
  }
}
