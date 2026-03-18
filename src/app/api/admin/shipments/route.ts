import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const status = searchParams.get("status");
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");

  const allowed = ["createdAt", "shippedAt", "deliveredAt", "status"];
  const orderField = allowed.includes(sortBy) ? sortBy : "createdAt";

  const where = status ? { status } : {};

  const [shipments, total] = await Promise.all([
    prisma.bibleDrop.findMany({
      where,
      include: {
        address: true,
        donation: { include: { user: { select: { email: true, name: true } } } },
      },
      orderBy: { [orderField]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bibleDrop.count({ where }),
  ]);

  return NextResponse.json({ shipments, total, page, limit });
}
