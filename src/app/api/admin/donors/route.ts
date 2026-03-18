import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const donors = await prisma.user.findMany({
      include: {
        donations: {
          include: { bibleDrops: true },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const donorsWithStats = donors.map((donor) => ({
      id: donor.id,
      name: donor.name,
      email: donor.email,
      createdAt: donor.createdAt,
      totalDonated: donor.donations.reduce((s, d) => s + d.amount, 0),
      bibleCount: donor.donations.reduce((s, d) => s + d.quantity, 0),
      donationCount: donor.donations.length,
      donations: donor.donations.map((d) => ({
        id: d.id,
        amount: d.amount,
        quantity: d.quantity,
        status: d.status,
        createdAt: d.createdAt,
        bibleDrops: d.bibleDrops,
      })),
    }));

    return NextResponse.json(donorsWithStats);
  } catch {
    return NextResponse.json({ error: "Failed to fetch donors" }, { status: 500 });
  }
}
