import type { Context, Next } from "hono";
import {
  testimonialGetSchema,
  testimonialPostSchema,
  testimonialPutSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";

export const testimonialPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:testimonial-post`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { url } = await c.req.json();

  //test
  const validate = testimonialPostSchema.safeParse({ url });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("params", validate.data.url);

  await next();
};

export const testimonialGetMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}:testimonial-get`,
    100,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { take, skip } = c.req.query();

  const validate = testimonialGetSchema.safeParse({ take, skip });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  const takeNumber = parseInt(take);
  const skipNumber = parseInt(skip);

  c.set("params", { take: takeNumber, skip: skipNumber });

  await next();
};

export const testimonialPutMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionAdmin(user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const { id } = c.req.param();

  const validate = testimonialPutSchema.safeParse({ id });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("params", validate.data);

  await next();
};
