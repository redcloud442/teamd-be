import type { Context, Next } from "hono";
import { transactionSchemaPost } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMemberUser } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";

export const transactionPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionMemberUser(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:transaction-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { limit, page, status } = await c.req.json();

  //test
  const validate = transactionSchemaPost.safeParse({ limit, page, status });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  c.set("params", validate.data);
  await next();
};
