import type { Context, Next } from "hono";
import {
  updateWithdrawSchema,
  withdrawHideUserPostSchema,
  withdrawHistoryPostSchema,
  withdrawHistoryReportPostSchema,
  withdrawListPostSchema,
  withdrawPostSchema,
  withdrawTotalReportPostSchema,
  withdrawUserGetSchema,
} from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import {
  protectionAccountingAdmin,
  protectionMemberUser,
} from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";

export const withdrawPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-post`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const body = await c.req.json();

  const amountWithoutCommas = body.amount.replace(/,/g, "");

  const validate = withdrawPostSchema.safeParse({
    earnings: body.earnings,
    accountNumber: body.accountNumber,
    accountName: body.accountName,
    amount: amountWithoutCommas,
    bank: body.bank,
    phoneNumber: body.phoneNumber,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawHistoryPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-history-get`,
    50,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { page, limit, search, columnAccessor, isAscendingSort, userId } =
    await c.req.json();

  const validate = withdrawHistoryPostSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userId,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const updateWithdrawMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:update-withdraw`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { status, note, singleFile } = await c.req.json();

  const { id } = c.req.param();

  const validate = updateWithdrawSchema.safeParse({
    status,
    note,
    singleFile,
    requestId: id,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawListPostMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-list-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const {
    page,
    limit,
    search,
    columnAccessor,
    userFilter,
    statusFilter,
    isAscendingSort,
    dateFilter,
    showHiddenUser,
    showAllDays,
  } = await c.req.json();

  const validate = withdrawListPostSchema.safeParse({
    page,
    limit,
    search,
    columnAccessor,
    userFilter,
    statusFilter,
    isAscendingSort,
    dateFilter,
    showHiddenUser,
    showAllDays,
  });

  if (!validate.success) {
    return sendErrorResponse("Invalid request", 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawHistoryReportPostMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-history-report-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { dateFilter } = await c.req.json();

  const validate = withdrawHistoryReportPostSchema.safeParse(dateFilter);

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawTotalReportPostMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-history-report-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { type, take, skip } = await c.req.json();

  const validate = withdrawTotalReportPostSchema.safeParse({
    type,
    take,
    skip,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawHideUserPostMiddleware = async (
  c: Context,
  next: Next
) => {
  const user = c.get("user");

  const response = await protectionAccountingAdmin(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-hide-user-post`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();
  const { type } = await c.req.json();

  const validate = withdrawHideUserPostSchema.safeParse({
    id,
    type,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};

export const withdrawUserGetMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");

  const response = await protectionMemberUser(user);

  if (response instanceof Response) {
    return response;
  }

  const { teamMemberProfile } = response;

  if (!teamMemberProfile) {
    return sendErrorResponse("Unauthorized", 401);
  }

  const isAllowed = await rateLimit(
    `rate-limit:${teamMemberProfile.company_member_id}:withdraw-user-get`,
    100,
    "1m",
    c
  );

  if (!isAllowed) {
    return sendErrorResponse("Too Many Requests", 429);
  }

  const { id } = c.req.param();

  const validate = withdrawUserGetSchema.safeParse({
    id,
  });

  if (!validate.success) {
    return sendErrorResponse(validate.error.message, 400);
  }

  c.set("teamMemberProfile", teamMemberProfile);
  c.set("params", validate.data);

  await next();
};
