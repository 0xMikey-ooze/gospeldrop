import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { parseSearchParams, validationErrorResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { paginationQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { page, limit } = parseSearchParams(request, paginationQuerySchema);

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
  } catch (error) {
    const response = validationErrorResponse(error);
    if (response) return response;
    throw error;
  }
}
