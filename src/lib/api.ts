import { ZodError, ZodType } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { MemoryRateLimiter } from "./rate-limit";

const apiRateLimiter = new MemoryRateLimiter({
  limit: 30,
  windowMs: 60_000,
});

export function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  return "unknown";
}

export function applyRateLimit(request: NextRequest) {
  const result = apiRateLimiter.check(getClientIdentifier(request));

  if (!result.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": Math.ceil(result.resetAt / 1000).toString(),
          "Retry-After": Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 1).toString(),
        },
      }
    );
  }

  return null;
}

export function validationErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  return null;
}

export async function parseJsonBody<T>(request: Request, schema: ZodType<T>) {
  const body = await request.json();
  return schema.parse(body);
}

export function parseSearchParams<T>(request: NextRequest, schema: ZodType<T>) {
  const raw = Object.fromEntries(request.nextUrl.searchParams.entries());
  return schema.parse(raw);
}
