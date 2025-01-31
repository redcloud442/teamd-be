import { sendErrorResponse } from "../../utils/function.js";
import { updateWithdrawModel, withdrawHistoryModel, withdrawListPostModel, withdrawModel, } from "./withdraw.model.js";
export const withdrawPostController = async (c) => {
    try {
        const { earnings, accountNumber, accountName, amount, bank } = await c.req.json();
        const teamMemberProfile = c.get("teamMemberProfile");
        await withdrawModel({
            earnings,
            accountNumber,
            accountName,
            amount,
            bank,
            teamMemberProfile,
        });
        return c.json({ message: "Withdrawal successful" }, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const withdrawHistoryPostController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await withdrawHistoryModel(params, teamMemberProfile);
        return c.json({ data }, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const updateWithdrawPostController = async (c) => {
    try {
        const { status, note } = await c.req.json();
        const { id } = c.req.param();
        const teamMemberProfile = c.get("teamMemberProfile");
        await updateWithdrawModel({
            status,
            note,
            teamMemberProfile,
            requestId: id,
        });
        return c.json({ message: "Withdrawal updated" }, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const withdrawListPostController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await withdrawListPostModel({
            parameters: params,
            teamMemberProfile,
        });
        return c.json(data, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
