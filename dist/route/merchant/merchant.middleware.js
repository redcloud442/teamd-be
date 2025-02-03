import { merchantBankSchema, merchantDeleteSchema, merchantPatchSchema, merchantPostSchema, } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin, protectionMemberUser, protectionMerchantAdmin, } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const merchantGetMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMemberUser(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:merchant-get`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    await next();
};
export const merchantDeleteMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:merchant-delete`, 50, 60);
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
export const merchantPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:merchant-post`, 50, 60);
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
export const merchantPatchMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:merchant-patch`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { memberId, amount, userName } = await c.req.json();
    const validate = await merchantPatchSchema.safeParseAsync({
        amount,
        memberId,
        userName,
    });
    if (!validate.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validate.data);
    await next();
};
export const merchantBankMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:merchant-bank-get`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit } = await c.req.json();
    const validate = await merchantBankSchema.safeParseAsync({
        page,
        limit,
    });
    if (!validate.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validate.data);
    await next();
};
export const merchantBalanceMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:merchant-balance-history`, 50, 60);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit } = await c.req.json();
    const validate = await merchantBankSchema.safeParseAsync({
        page,
        limit,
    });
    if (!validate.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validate.data);
    await next();
};
