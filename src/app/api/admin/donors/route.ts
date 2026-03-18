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
      email: donor.email,
      name: donor.name,
      createdAt: donor.createdAt,
      totalDonated: donor.donations.reduce((sum, d) => sum + d.amount, 0),
      bibleCount: donor.donations.reduce((sum, d) => sum + d.quantity, 0),
      donations: donor.donations,
    }));

    return NextResponse.json(donorsWithStats);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
