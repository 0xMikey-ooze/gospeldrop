import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const [donors, total] = await Promise.all([
    prisma.user.findMany({
      include: {
        donations: {
          include: { bibleDrops: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count(),
  ]);

  const enriched = donors.map((user) => ({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    totalDonated: user.donations.reduce((s, d) => s + d.amount, 0),
    bibleCount: user.donations.reduce((s, d) => s + d.quantity, 0),
    donationHistory: user.donations.map((d) => ({
      id: d.id,
      amount: d.amount,
      quantity: d.quantity,
      status: d.status,
      createdAt: d.createdAt,
      bibleDrops: d.bibleDrops.map((b) => ({
        id: b.id,
        status: b.status,
        trackingNumber: b.trackingNumber,
      })),
    })),
  }));

  return NextResponse.json({ donors: enriched, total, page, limit });
}
