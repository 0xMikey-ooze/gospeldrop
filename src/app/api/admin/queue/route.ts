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

    const queue = await prisma.bibleDrop.findMany({
      where: { status: { in: ["pending", "processing"] } },
      include: {
        address: true,
        donation: { include: { user: { select: { email: true, name: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(queue);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
