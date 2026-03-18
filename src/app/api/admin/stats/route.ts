import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const [totalBiblesSent, pendingOrders, totalDonations] = await Promise.all([
      prisma.bibleDrop.count(),
      prisma.bibleDrop.count({ where: { status: "pending" } }),
      prisma.donation.aggregate({ _sum: { amount: true } }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const fulfilledThisMonth = await prisma.bibleDrop.count({
      where: {
        status: { in: ["shipped", "delivered"] },
        updatedAt: { gte: startOfMonth },
      },
    });

    const recentShipments = await prisma.bibleDrop.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { address: true, donation: { include: { user: true } } },
    });

    return NextResponse.json({
      totalBiblesSent,
      pendingOrders,
      fulfilledThisMonth,
      totalDonationsAmount: totalDonations._sum.amount || 0,
      recentShipments,
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
