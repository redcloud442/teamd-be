import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis once
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});

// Initialize Ratelimit once and reuse it
const ratelimit = new Ratelimit({
  redis: redis as any,
  limiter: Ratelimit.slidingWindow(10, "10s"), // Default values (change as needed)
  enableProtection: true,
  analytics: true,
});

let denyList: Set<string> = new Set();
let lastDenyListFetch = 0; // Timestamp of last fetch

/**
 * Rate Limit Function with Country Blocking
 * @param {string} identifier - Unique user key (IP, User ID, etc.)
 * @param {string} country - Country of the incoming request
 * @returns {boolean} - `true` if request is allowed, `false` if blocked
 */
export async function rateLimit(identifier: string, country: string) {
  const now = Date.now();

  if (now - lastDenyListFetch > 600000) {
    const countries = await redis.smembers(
      "@upstash/ratelimit:denyList:country"
    );
    console.log(countries);
    denyList = new Set(countries);
    lastDenyListFetch = now;
  }

  if (denyList.has(country)) {
    return false;
  }

  const { success, pending } = await ratelimit.limit(identifier, {
    country,
  });

  await pending;

  return success;
}
