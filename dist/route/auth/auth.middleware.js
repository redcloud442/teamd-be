import { loginCheckSchema, LoginSchema, registerUserSchema, } from "../../schema/schema.js";
import { supabaseClient } from "../../utils/supabase.js";
import { getClientIP, sendErrorResponse } from "../../utils/function.js";
import { rateLimit } from "../../utils/redis.js";
export const authMiddleware = async (c, next) => {
    const { userName, password } = await c.req.json();
    const parsed = LoginSchema.safeParse({ userName, password });
    if (!parsed.success) {
        return c.json({ message: "Invalid userName or password" }, 400);
    }
    const isAllowed = await rateLimit(`rate-limit:${userName}`, 5, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too many requests. Please try again later.", 429);
    }
    await next();
};
export const authGetMiddleware = async (c, next) => {
    const { searchParams } = new URL(c.req.url);
    const userName = searchParams.get("userName");
    const parsed = loginCheckSchema.safeParse({ userName });
    if (!parsed.success) {
        return c.json({ message: "Invalid userName" }, 400);
    }
    const isAllowed = await rateLimit(`rate-limit:${userName}`, 5, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too many requests. Please try again later.", 429);
    }
    await next();
};
export const loginCheckMiddleware = async (c, next) => {
    const { searchParams } = new URL(c.req.url);
    const userName = JSON.parse(searchParams.get("userName"));
    const parsed = loginCheckSchema.safeParse({ userName });
    if (!parsed.success) {
        return c.json({ message: "Invalid userName" }, 400);
    }
    await next();
};
export const registerUserMiddleware = async (c, next) => {
    const token = c.req.header("Authorization")?.split("Bearer ")[1];
    if (!token) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const supabase = supabaseClient;
    const user = await supabase.auth.getUser(token);
    if (user.error) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const ip = getClientIP(c.req.raw);
    const { userId, userName, password, firstName, lastName, referalLink, url } = await c.req.json();
    const parsed = registerUserSchema.safeParse({
        userName,
        password,
        firstName,
        userId,
        lastName,
        referalLink,
        url,
    });
    if (!parsed.success) {
        return c.json({ message: "Invalid request" }, 400);
    }
    const isAllowed = await rateLimit(`rate-limit:${userName}:${ip}`, 5, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too many requests. Please try again later.", 429);
    }
    await next();
};
