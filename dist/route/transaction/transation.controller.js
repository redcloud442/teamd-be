import { sendErrorResponse } from "../../utils/function.js";
import { transactionModelGet } from "./transaction.model.js";
export const transactionPostController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await transactionModelGet({
            limit: params.limit,
            page: params.page,
            status: params.status,
            teamMemberProfile,
        });
        return c.json(data, 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
