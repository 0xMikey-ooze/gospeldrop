import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@gospeldrop.org";
  return email === adminEmail;
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";

    const validSortFields = ["createdAt", "status", "shippedAt", "deliveredAt"];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const shipments = await prisma.bibleDrop.findMany({
      include: {
        address: true,
        donation: { include: { user: { select: { email: true, name: true } } } },
      },
      orderBy: { [orderByField]: sortOrder },
    });

    return NextResponse.json(shipments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
