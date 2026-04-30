import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { parseJsonBody, validationErrorResponse } from "@/lib/api";
import { registerBodySchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await parseJsonBody(req, registerBodySchema);
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name: name || email.split("@")[0], passwordHash },
    });
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    const validationError = validationErrorResponse(error);
    if (validationError) return validationError;
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
