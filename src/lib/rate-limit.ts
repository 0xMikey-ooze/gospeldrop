export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly config: RateLimitConfig) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      const resetAt = now + this.config.windowMs;
      this.buckets.set(key, { count: 1, resetAt });

      return {
        success: true,
        limit: this.config.limit,
        remaining: Math.max(this.config.limit - 1, 0),
        resetAt,
      };
    }

    if (current.count >= this.config.limit) {
      return {
        success: false,
        limit: this.config.limit,
        remaining: 0,
        resetAt: current.resetAt,
      };
    }

    current.count += 1;
    this.buckets.set(key, current);

    return {
      success: true,
      limit: this.config.limit,
      remaining: Math.max(this.config.limit - current.count, 0),
      resetAt: current.resetAt,
    };
  }
}
