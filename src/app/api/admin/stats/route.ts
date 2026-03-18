import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gospeldrop.org";
  return email === adminEmail;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalBibles, pendingOrders, fulfilledThisMonth, totalDonations] = await Promise.all([
      prisma.bibleDrop.count(),
      prisma.bibleDrop.count({ where: { status: "pending" } }),
      prisma.bibleDrop.count({
        where: { status: "delivered", deliveredAt: { gte: startOfMonth } },
      }),
      prisma.donation.aggregate({ _sum: { amount: true } }),
    ]);

    return NextResponse.json({
      totalBibles,
      pendingOrders,
      fulfilledThisMonth,
      totalDonationsAmount: totalDonations._sum.amount || 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
