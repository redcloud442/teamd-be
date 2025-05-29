import { supabaseClient } from "@/utils/supabase.js";
import type { User } from "@supabase/supabase-js";
import type { Context, Next } from "hono";
import type { ZodSchema } from "node_modules/zod/lib/types.js";
import { sendErrorResponse } from "../utils/function.js";
import { rateLimit } from "../utils/redis.js";
import { getSupabase } from "./auth.middleware.js";

export const protectionMiddleware = async (c: Context, next: Next) => {
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

export const protectionMiddlewareToken = async (c: Context, next: Next) => {
  const token = c.req.query("access_token");

  const { data, error } = await supabaseClient.auth.getUser(token);

  if (error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  if (!data.user) {
    return sendErrorResponse("Unauthorized", 401);
  }

  c.set("user", data.user);

  await next();
};

export const createAuthMiddleware = (
  protectionFn: (user: User) => Promise<any>
) => {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    const response = await protectionFn(user);
    if (response instanceof Response) return response;

    const { teamMemberProfile } = response;
    if (!teamMemberProfile) return sendErrorResponse("Unauthorized", 401);

    c.set("teamMemberProfile", teamMemberProfile);
    await next();
  };
};

export const validateBody = <T>(schema: ZodSchema<T>, body: T) => {
  return async (c: Context, next: Next) => {
    const result = schema.safeParse(body);

    if (!result.success) {
      return sendErrorResponse(result.error.message, 400);
    }

    c.set("params", result.data);
    await next();
  };
};

export const rateLimitByKey = (
  keyFn: (c: Context) => string,
  limit: number,
  window: "10s" | "1m" | "5m" | "1h"
) => {
  return async (c: Context, next: Next) => {
    const key = keyFn(c);
    const allowed = await rateLimit(key, limit, window, c);

    if (!allowed) return sendErrorResponse("Too Many Requests", 429);

    await next();
  };
};
