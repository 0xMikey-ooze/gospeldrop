import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortDir = (searchParams.get("sortDir") || "desc") as "asc" | "desc";
  const status = searchParams.get("status") || undefined;

  const validSortFields = ["createdAt", "status", "shippedAt", "deliveredAt"];
  const orderField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

  try {
    const shipments = await prisma.bibleDrop.findMany({
      where: status ? { status } : undefined,
      orderBy: { [orderField]: sortDir },
      include: {
        address: true,
        donation: { include: { user: true } },
      },
    });
    return NextResponse.json(shipments);
  } catch {
    return NextResponse.json({ error: "Failed to fetch shipments" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { id, status, trackingNumber } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const updateData: any = { status };
    if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
    if (status === "shipped") updateData.shippedAt = new Date();
    if (status === "delivered") updateData.deliveredAt = new Date();

    const updated = await prisma.bibleDrop.update({
      where: { id },
      data: updateData,
      include: { address: true, donation: { include: { user: true } } },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update shipment" }, { status: 500 });
  }
}
