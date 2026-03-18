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

  const [items, total] = await Promise.all([
    prisma.bibleDrop.findMany({
      where: { status: "pending" },
      include: {
        address: true,
        donation: { include: { user: { select: { email: true, name: true } } } },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.bibleDrop.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({ queue: items, total, page, limit });
}
