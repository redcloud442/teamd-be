import { supabaseClient } from "../../utils/supabase.js";
import { depositHistoryPostModel, depositListPostModel, depositPostModel, depositPutModel, } from "./deposit.model.js";
export const depositPostController = async (c) => {
    const supabase = supabaseClient;
    const { TopUpFormValues, publicUrl } = await c.req.json();
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const { amount, topUpMode, accountName, accountNumber } = TopUpFormValues;
        await depositPostModel({
            TopUpFormValues: { amount, topUpMode, accountName, accountNumber },
            publicUrl: publicUrl,
            teamMemberProfile: teamMemberProfile,
        });
        return c.json({ message: "Deposit Created" }, { status: 200 });
    }
    catch (e) {
        await supabase.storage.from("REQUEST_ATTACHMENTS").remove([publicUrl]);
        return c.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
export const depositPutController = async (c) => {
    try {
        const { status, note, requestId } = c.get("sanitizedData");
        const teamMemberProfile = c.get("teamMemberProfile");
        await depositPutModel({
            status,
            note,
            requestId,
            teamMemberProfile,
        });
        return c.json({ message: "Deposit Updated" }, { status: 200 });
    }
    catch (e) {
        return c.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
export const depositHistoryPostController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await depositHistoryPostModel(params, teamMemberProfile);
        return c.json(data, { status: 200 });
    }
    catch (e) {
        return c.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
export const depositListPostController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await depositListPostModel(params, teamMemberProfile);
        return c.json(data, { status: 200 });
    }
    catch (e) {
        return c.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
