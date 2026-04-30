import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { parseSearchParams, validationErrorResponse } from "@/lib/api";
import { shipmentsQuerySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { sortBy, sortDir, status, page, limit } = parseSearchParams(
      request,
      shipmentsQuerySchema
    );

    const where = status ? { status } : {};

    const [shipments, total] = await Promise.all([
      prisma.bibleDrop.findMany({
        where,
        include: {
          address: true,
          donation: { include: { user: { select: { email: true, name: true } } } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.bibleDrop.count({ where }),
    ]);

    return NextResponse.json({ shipments, total, page, limit });
  } catch (error) {
    return validationErrorResponse(error) ??
      NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 });
  }
}
