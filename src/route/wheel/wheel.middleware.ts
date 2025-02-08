import type { Context, Next } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";

export const wheelPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile?.alliance_member_id}:wheel-post`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too many requests. Please try again later.", 429);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};
