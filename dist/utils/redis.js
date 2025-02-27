import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "https://default.redis.url'",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "'default-redis-token'",
});
/**
 * Rate Limit Function with Dynamic Time Window
 * @param {string} identifier - Unique user key (IP, User ID, etc.)
 * @param {number} maxRequests - Maximum allowed requests
 * @param {string} timeWindow - Time duration (e.g., "10 s", "1 m", "5 m", "1 h")
 * @returns {boolean} - `true` if request is allowed, `false` if rate limit exceeded
 */
export async function rateLimit(identifier, maxRequests, timeWindow) {
    const ratelimit = new Ratelimit({
        redis: redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${timeWindow}`),
        enableProtection: true,
        analytics: true,
    });
    const { success, pending } = await ratelimit.limit(identifier, {
        ip: "ip-address",
        userAgent: "user-agent",
        country: "country",
    });
    await pending;
    return success;
}
