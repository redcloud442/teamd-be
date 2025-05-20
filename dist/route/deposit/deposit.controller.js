import { invalidateCache } from "../../utils/function.js";
import { supabaseClient } from "../../utils/supabase.js";
import { depositHistoryPostModel, depositListPostModel, depositPostModel, depositPutModel, depositReferencePostModel, depositReportPostModel, depositUserGetModel, } from "./deposit.model.js";
export const depositPostController = async (c) => {
    const supabase = supabaseClient;
    const { publicUrl } = await c.req.json();
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const params = c.get("params");
        await depositPostModel({
            TopUpFormValues: {
                ...params,
            },
            publicUrl: publicUrl,
            teamMemberProfile: teamMemberProfile,
        });
        await invalidateCache(`transaction:${teamMemberProfile.company_member_id}:DEPOSIT`);
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
export const depositUserGetController = async (c) => {
    try {
        const params = c.get("params");
        const data = await depositUserGetModel(params);
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
export const depositReferencePostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await depositReferencePostModel(params);
        return c.json(data, { status: 200 });
    }
    catch (e) {
        return c.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
export const depositReportPostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await depositReportPostModel(params);
        return c.json(data, { status: 200 });
    }
    catch (e) {
        return c.json({ message: "Internal Server Error" }, { status: 500 });
    }
};
