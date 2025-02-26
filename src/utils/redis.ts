import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});

export default redis;

const rateLimitCache = new Map();

/**
 * Rate Limiting Function
 * @param {string} key - Unique rate limit key (e.g., `rate-limit:user-123:action`)
 * @param {number} limit - Max number of requests allowed
 * @param {number} ttl - Time window in seconds
 * @returns {boolean} - `true` if request is allowed, `false` if rate limit exceeded
 */
export async function rateLimit(key: string, limit: number, ttl: number) {
  if (rateLimitCache.has(key)) {
    const cachedCount = rateLimitCache.get(key);
    if (cachedCount >= limit) return false;
  }

  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.expire(key, ttl);
  }

  rateLimitCache.set(key, currentCount);
  setTimeout(() => rateLimitCache.delete(key), ttl * 1000);

  return currentCount <= limit;
}
