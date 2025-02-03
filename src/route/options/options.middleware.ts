import type { Context, Next } from "hono";
import { userOptionsPostSchema } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMerchantAdminAccounting } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
import { supabaseClient } from "../../utils/supabase.js";

export const userOptionsPostMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionMerchantAdminAccounting(
    user.data.user.id,
    prisma
  );

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:user-options-post`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { page, limit } = await c.req.json();

  const validation = userOptionsPostSchema.safeParse({
    page,
    limit,
  });

  if (!validation.success) {
    return sendErrorResponse("Invalid request", 400);
  }

  c.set("params", validation.data);

  await next();
};
