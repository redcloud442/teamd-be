import { Redis } from "@upstash/redis";
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});
export default redis;
export async function rateLimit(key, limit, ttl) {
    const currentCount = await redis.incr(key);
    if (currentCount === 1) {
        // Set expiration time for the key
        await redis.expire(key, ttl);
    }
    if (currentCount > limit) {
        return false; // Rate limit exceeded
    }
    return true; // Within rate limit
}
