import { sendErrorResponse } from "../../utils/function.js";
import { transactionModelGet } from "./transaction.model.js";
export const transactionPostController = async (c) => {
    try {
        const { limit, page } = await c.req.json();
        const teamMemberProfile = c.get("teamMemberProfile");
        const { totalTransactions, transactionHistory } = await transactionModelGet({ limit, page, teamMemberProfile });
        return c.json({ totalTransactions, transactionHistory });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
