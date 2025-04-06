import { userOptionsPostSchema } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionMerchantAdminAccounting } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const userOptionsPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionMerchantAdminAccounting(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.company_member_id}:user-options-post`, 100, "1m", c);
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { page, limit } = await c.req.json();
    const validation = userOptionsPostSchema.safeParse({
        page,
        limit,
    });
    if (!validation.success) {
        return sendErrorResponse("Invalid request", 400);
    }
    c.set("params", validation.data);
    await next();
};
