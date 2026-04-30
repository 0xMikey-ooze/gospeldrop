import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

export async function GET(request: Request, context: { params: { nextauth: string[] } }) {
  return NextAuth(getAuthOptions())(request, context);
}

export async function POST(request: Request, context: { params: { nextauth: string[] } }) {
  return NextAuth(getAuthOptions())(request, context);
}
