import type { Context, Next } from "hono";
import {
  merchantDeleteSchema,
  merchantPatchSchema,
  merchantPostSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import {
  protectionMemberUser,
  protectionMerchantAdmin,
} from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
import { supabaseClient } from "../../utils/supabase.js";

export const merchantGetMiddleware = async (c: Context, next: Next) => {
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
    `rate-limit:${teamMemberProfile.alliance_member_id}`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  await next();
};

export const merchantDeleteMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionMerchantAdmin(user.data.user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { merchantId } = await c.req.json();

  const validate = await merchantDeleteSchema.safeParseAsync({ merchantId });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};

export const merchantPostMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionMerchantAdmin(user.data.user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { accountNumber, accountType, accountName } = await c.req.json();

  const validate = await merchantPostSchema.safeParseAsync({
    accountNumber,
    accountType,
    accountName,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};

export const merchantPatchMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionMerchantAdmin(user.data.user.id, prisma);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.alliance_member_id}`,
    50,
    60
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { memberId, amount } = await c.req.json();

  const validate = await merchantPatchSchema.safeParseAsync({
    amount,
    memberId,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};
