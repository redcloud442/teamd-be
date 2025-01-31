import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});

export default redis;

export async function rateLimit(key: string, limit: number, ttl: number) {
  const currentCount = await redis.incr(key);

  if (currentCount === 1) {
    await redis.expire(key, ttl);
  } else {
    const ttlCheck = await redis.ttl(key);
    if (ttlCheck === -1) {

      await redis.expire(key, ttl);
    }
  }

  if (currentCount > limit) {
    return false; // Rate limit exceeded
  }

  return true; // Within rate limit
}
