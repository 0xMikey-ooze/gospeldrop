import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRateLimiter } from "@/lib/rate-limit";

describe("MemoryRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("allows requests until the configured limit is reached", () => {
    const limiter = new MemoryRateLimiter({
      limit: 2,
      windowMs: 60_000,
    });

    expect(limiter.check("127.0.0.1").success).toBe(true);
    expect(limiter.check("127.0.0.1").success).toBe(true);

    const blocked = limiter.check("127.0.0.1");
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets the window after expiry", () => {
    const limiter = new MemoryRateLimiter({
      limit: 1,
      windowMs: 5_000,
    });

    expect(limiter.check("ip").success).toBe(true);
    expect(limiter.check("ip").success).toBe(false);

    vi.advanceTimersByTime(5_001);

    const retried = limiter.check("ip");
    expect(retried.success).toBe(true);
    expect(retried.remaining).toBe(0);
  });

  it("tracks clients independently", () => {
    const limiter = new MemoryRateLimiter({
      limit: 1,
      windowMs: 60_000,
    });

    expect(limiter.check("client-a").success).toBe(true);
    expect(limiter.check("client-b").success).toBe(true);
  });
});
