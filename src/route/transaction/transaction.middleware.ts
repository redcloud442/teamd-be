import type { Context, Next } from "hono";
import { transactionSchemaPost } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
import { supabaseClient } from "../../utils/supabase.js";

export const transactionPostMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionMemberUser(user.data.user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:transaction-post`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { limit, page } = await c.req.json();

  const validate = transactionSchemaPost.safeParse({ limit, page });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};
