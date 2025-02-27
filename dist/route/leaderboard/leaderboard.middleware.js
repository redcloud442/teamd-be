import { leaderboardPostSchema } from "../../schema/schema.js";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { protectionAdmin } from "../../utils/protection.js";
import { rateLimit } from "../../utils/redis.js";
export const leaderboardPostMiddleware = async (c, next) => {
    const user = c.get("user");
    const response = await protectionAdmin(user.id, prisma);
    if (response instanceof Response) {
        return response;
    }
    const { teamMemberProfile } = response;
    if (!teamMemberProfile) {
        return sendErrorResponse("Unauthorized", 401);
    }
    const isAllowed = await rateLimit(`rate-limit:${teamMemberProfile.alliance_member_id}:leaderboard-post`, 100, "1m");
    if (!isAllowed) {
        return sendErrorResponse("Too Many Requests", 429);
    }
    const { leaderBoardType, limit, page } = await c.req.json();
    const validate = leaderboardPostSchema.safeParse({
        leaderBoardType,
        limit,
        page,
    });
    if (!validate.success) {
        return sendErrorResponse("Invalid Request", 400);
    }
    c.set("params", validate.data);
    await next();
};
