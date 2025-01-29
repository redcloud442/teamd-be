import type { Context, Next } from "hono";
import {
  userGenerateLinkSchema,
  userListSchema,
  userProfileSchemaPatch,
  userSchemaPatch,
  userSchemaPost,
  userSchemaPut,
  userSponsorSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import {
  protectionAdmin,
  protectionMemberUser,
} from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
import { supabaseClient } from "../../utils/supabase.js";

export const userPutMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return null;
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

  const { email, userId, password } = await c.req.json();

  const validate = userSchemaPut.safeParse({ email, userId, password });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};

export const userPostMiddleware = async (c: Context, next: Next) => {
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

  const { memberId } = await c.req.json();

  const validate = userSchemaPost.safeParse({ memberId });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  await next();
};

export const userGetMiddleware = async (c: Context, next: Next) => {
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

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userPatchMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionAdmin(user.data.user.id, prisma);

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

  const { id } = c.req.param();

  const { action = "updateRole", role } = await c.req.json();

  const validate = userSchemaPatch.safeParse({ memberId: id, action, role });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userSponsorMiddleware = async (c: Context, next: Next) => {
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

  const { userId } = await c.req.json();

  const validate = userSponsorSchema.safeParse({ userId });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userProfilePutMiddleware = async (c: Context, next: Next) => {
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

  const { id } = c.req.param();

  const { profilePicture } = await c.req.json();

  const validate = userProfileSchemaPatch.safeParse({
    profilePicture,
    userId: id,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userGenerateLinkMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionAdmin(user.data.user.id, prisma);

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

  const { formattedUserName } = await c.req.json();

  const validate = userGenerateLinkSchema.safeParse({
    formattedUserName,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);

  await next();
};

export const userListMiddleware = async (c: Context, next: Next) => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const supabase = supabaseClient;

  const user = await supabase.auth.getUser(token);

  if (user.error) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const response = await protectionAdmin(user.data.user.id, prisma);

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

  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
  } = await c.req.json();

  const validate = userListSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userRole,
    dateCreated,
    bannedUser,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid Request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};
