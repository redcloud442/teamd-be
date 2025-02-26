import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis once
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});

// Initialize Ratelimit once and reuse it

let denyList: Set<string> = new Set();
let lastDenyListFetch = 0; // Timestamp of last fetch

/**
 * Rate Limit Function with Country Blocking
 * @param {string} identifier - Unique user key (IP, User ID, etc.)
 * @param {string} country - Country of the incoming request
 * @returns {boolean} - `true` if request is allowed, `false` if blocked
 */
export async function rateLimit(
  identifier: string,
  maxRequests: number,
  timeWindow: "10s" | "1m" | "1h" | "1d"
) {
  const now = Date.now();

  const ratelimit = new Ratelimit({
    redis: redis as any,
    limiter: Ratelimit.slidingWindow(maxRequests, `${timeWindow}`),
    enableProtection: true,
    analytics: true,
  });

  if (now - lastDenyListFetch > 600000) {
    const countries = await redis.smembers(
      "@upstash/ratelimit:denyList:country"
    );

    denyList = new Set(countries);
    lastDenyListFetch = now;
  }

  if (denyList.has(identifier)) {
    return false;
  }
  const { success, pending } = await ratelimit.limit(identifier, {
    country: Array.from(denyList).join(","),
  });

  await pending;

  return success;
}
