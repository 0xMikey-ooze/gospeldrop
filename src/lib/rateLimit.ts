import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store — suitable for single-instance deployments.
// For multi-instance / edge deployments, replace with Redis or Upstash.
const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes to prevent unbounded growth.
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | undefined;

function scheduleCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    store.forEach((entry, key) => {
      if (entry.resetAt <= now) store.delete(key);
    });
  }, CLEANUP_INTERVAL_MS);
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as NodeJS.Timeout).unref();
  }
}

export interface RateLimitOptions {
  /** Maximum number of requests allowed per window. */
  max: number;
  /** Window duration in seconds. */
  windowSeconds: number;
  /** Optional key suffix to namespace separate limiters. */
  namespace?: string;
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Check rate limit for a request. Returns a 429 NextResponse if the limit
 * is exceeded, or null if the request should proceed.
 */
export function checkRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): NextResponse | null {
  scheduleCleanup();

  const { max, windowSeconds, namespace = "default" } = options;
  const ip = getClientIp(req);
  const key = `${namespace}:${ip}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  const remaining = Math.max(0, max - entry.count);
  const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(max),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetSeconds),
  };

  if (entry.count > max) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(resetSeconds),
        },
      }
    );
  }

  return null;
}

/** Pre-configured limiter for authentication endpoints (strict). */
export function checkAuthRateLimit(req: NextRequest): NextResponse | null {
  const max = Number(process.env.RATE_LIMIT_AUTH_MAX ?? 10);
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  return checkRateLimit(req, { max, windowSeconds, namespace: "auth" });
}

/** Pre-configured limiter for general API endpoints. */
export function checkApiRateLimit(req: NextRequest): NextResponse | null {
  const max = Number(process.env.RATE_LIMIT_MAX ?? 100);
  const windowSeconds = Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60);
  return checkRateLimit(req, { max, windowSeconds, namespace: "api" });
}
