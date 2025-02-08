import { updateWithdrawSchema, withdrawHistoryPostSchema, withdrawListPostSchema, withdrawPostSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAccountingAdmin, protectionMemberUser, } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const withdrawPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-post`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { earnings, accountNumber, accountName, amount, bank } = await c.req.json();
    const amountWithoutCommas = amount.replace(/,/g, "");
    const validate = withdrawPostSchema.safeParse({
        earnings,
        accountNumber,
        accountName,
        amount: amountWithoutCommas,
        bank,
    });
    if (!validate.success) {
        return sendErrorResponse(validate.error.message, 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", validate.data);
    await next();
};
export const withdrawHistoryPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-history-get`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit, search, columnAccessor, isAscendingSort, userId } = await c.req.json();
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
export const updateWithdrawMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAccountingAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:update-withdraw`, 100, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { status, note } = await c.req.json();
    const { id } = c.req.param();
    const validate = updateWithdrawSchema.safeParse({
        status,
        note,
        requestId: id,
    });
    if (!validate.success) {
        return sendErrorResponse(validate.error.message, 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    await next();
};
export const withdrawListPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAccountingAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:withdraw-list-post`, 100, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit, search, columnAccessor, userFilter, statusFilter, isAscendingSort, dateFilter, } = await c.req.json();
    const validate = withdrawListPostSchema.safeParse({
        page,
        limit,
        search,
        columnAccessor,
        userFilter,
        statusFilter,
        isAscendingSort,
        dateFilter,
    });
    if (!validate.success) {
        return sendErrorResponse("Invalid request", 400);
    }
    c.set("teamMemberProfile", teamMemberProfile);
    c.set("params", validate.data);
    await next();
};
