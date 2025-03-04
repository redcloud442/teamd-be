import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
// Ensure environment variables are set correctly
if (!process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error("Upstash Redis credentials are missing.");
}
// Create a single Redis connection
export const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
// Cache rate limiter instances to avoid recreating them per request
const rateLimiterInstances = new Map();
/**
 * Rate Limit Function with Custom Sliding Windows per Request
 * @param {string} identifier - Unique user key (IP, User ID, etc.)
 * @param {number} maxRequests - Maximum allowed requests
 * @param {string} timeWindow - Time duration (e.g., "10s", "1m", "5m", "1h")
 * @param {Context} context - Hono request context
 * @returns {boolean} - `true` if request is allowed, `false` if rate limit exceeded
 */
export async function rateLimit(identifier, maxRequests, timeWindow, context) {
    // Unique rate limiter instance per user/API combination
    const limiterKey = `${identifier}:${maxRequests}:${timeWindow}`;
    if (!rateLimiterInstances.has(limiterKey)) {
        rateLimiterInstances.set(limiterKey, new Ratelimit({
            redis: redis,
            limiter: Ratelimit.slidingWindow(maxRequests, timeWindow),
            enableProtection: true,
            analytics: true,
        }));
    }
    const ratelimit = rateLimiterInstances.get(limiterKey);
    // Extract relevant headers
    const ip = context.req.raw.headers.get("cf-connecting-ip") || undefined;
    const userAgent = context.req.raw.headers.get("user-agent") || undefined;
    // Perform rate limit check directly from Upstash (no caching)
    const { success } = await ratelimit.limit(identifier, { ip, userAgent });
    return success;
}
