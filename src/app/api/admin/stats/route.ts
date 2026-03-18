import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBiblesSent, pendingOrders, fulfilledThisMonth, totalDonors] = await Promise.all([
    prisma.bibleDrop.count(),
    prisma.bibleDrop.count({ where: { status: "pending" } }),
    prisma.bibleDrop.count({
      where: { status: "delivered", deliveredAt: { gte: startOfMonth } },
    }),
    prisma.user.count(),
  ]);

  const totalDonated = await prisma.donation.aggregate({
    _sum: { amount: true },
    where: { status: "completed" },
  });

  return NextResponse.json({
    totalBiblesSent,
    pendingOrders,
    fulfilledThisMonth,
    totalDonors,
    totalDonated: totalDonated._sum.amount ?? 0,
  });
}
