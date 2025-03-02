import type { Context, Next } from "hono";
import { wheelPutSchema, wheelPutSettingsSchema } from "../../schema/schema.js";
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
    10,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too many requests. Please try again later.", 429);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const wheelGetMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile?.alliance_member_id}:wheel-get`,
    10,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too many requests. Please try again later.", 429);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const wheelPutMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile?.alliance_member_id}:wheel-put`,
    10,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too many requests. Please try again later.", 429);
  }

  const { quantity } = await c.req.json();

  const validate = wheelPutSchema.safeParse({
    quantity,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const wheelPutSettingsMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile?.alliance_member_id}:wheel-put-settings`,
    10,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too many requests. Please try again later.", 429);
  }

  const { percentage, label, color } = await c.req.json();
  const id = c.req.param("id");

  const validate = wheelPutSettingsSchema.safeParse({
    percentage,
    label,
    color,
    id,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};
