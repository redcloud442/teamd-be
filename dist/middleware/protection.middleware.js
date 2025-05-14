import { sendErrorResponse } from "../utils/function.js";
import { rateLimit } from "../utils/redis.js";
import { getSupabase } from "./auth.middleware.js";
export const protectionMiddleware = async (c, next) => {
    const supabase = getSupabase(c);
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        return sendErrorResponse("Unauthorized", 401);
    }
    if (!data.user) {
        return sendErrorResponse("Unauthorized", 401);
    }
    c.set("user", data.user);
    await next();
};
export const createAuthMiddleware = (protectionFn) => {
    return async (c, next) => {
        const user = c.get("user");
        const response = await protectionFn(user);
        if (response instanceof Response)
            return response;
        const { teamMemberProfile } = response;
        if (!teamMemberProfile)
            return sendErrorResponse("Unauthorized", 401);
        c.set("teamMemberProfile", teamMemberProfile);
        await next();
    };
};
export const validateBody = (schema, body) => {
    return async (c, next) => {
        const result = schema.safeParse(body);
        if (!result.success) {
            return sendErrorResponse(result.error.message, 400);
        }
        c.set("params", result.data);
        await next();
    };
};
export const rateLimitByKey = (keyFn, limit, window) => {
    return async (c, next) => {
        const key = keyFn(c);
        const allowed = await rateLimit(key, limit, window, c);
        if (!allowed)
            return sendErrorResponse("Too Many Requests", 429);
        await next();
    };
};
