import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Context, MiddlewareHandler } from "hono";
import { Redis as RedisSubscriber } from "ioredis";

// Singleton Redis client (reuse connection ✅)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const redisSubscriber = new RedisSubscriber(
  process.env.REDIS_WEBSOCKET_URL!,
  {
    keyPrefix: "deposit",
  }
);
/**
 * Dynamically apply rate limiting using @upstash/ratelimit
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  timeWindow: "10s" | "1m" | "5m" | "1h",
  c: Context
): Promise<{
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
}> {
  const ip =
    c.req.header("cf-connecting-ip") ||
    c.req.header("x-forwarded-for") ||
    (c.req.raw as any).connection?.remoteAddress ||
    "unknown";

  const userAgent = c.req.header("user-agent") || "unknown";

  // Create limiter instance per use (safe: redis is shared)
  const limiter = new Ratelimit({
    redis: redis as any,
    limiter: Ratelimit.slidingWindow(maxRequests, timeWindow),
    prefix: "@upstash/dynamic", // shared prefix, won't explode memory
    analytics: true,
    enableProtection: true,
  });

  const identifier = `${key}:${ip}:${userAgent}`;

  const result = await limiter.limit(identifier, {
    ip,
    userAgent,
  });

  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
    limit: maxRequests,
  };
}

const limiter = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(1000, "1h"),
  prefix: "@upstash/dynamic", // shared prefix, won't explode memory
  analytics: true,
  enableProtection: true,
});

export const globalRateLimit = (): MiddlewareHandler => {
  return async (c, next) => {
    const ip =
      c.req.header("x-forwarded-for") ||
      c.req.raw.headers.get("x-real-ip") ||
      (c.req.raw as any).connection?.remoteAddress ||
      "unknown";

    const result = await limiter.limit(ip, {
      ip,
    });

    if (!result.success) {
      return c.text("Too many requests. Please try again in 1 hour.", 429);
    }

    await next();
  };
};
