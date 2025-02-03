import { supabaseClient } from "./supabase.js";
export const sendErrorResponse = (message, status) => Response.json({ error: message }, { status });
export const sendSuccessResponse = (message, status) => Response.json({ message: message }, { status });
export const getClientIP = (request) => request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown";
export const getUserSession = async (token) => {
    const supabase = supabaseClient;
    const session = await supabase.auth.getUser(token);
    if (session.error) {
        return null;
    }
    return session.data.user;
};
export const calculateFinalAmount = (amount, selectedEarnings) => {
    if (selectedEarnings === "PACKAGE") {
        const fee = amount * 0.1;
        return amount - fee;
    }
    else if (selectedEarnings === "REFERRAL") {
        const fee = amount * 0.1;
        return amount - fee;
    }
    return amount;
};
export const calculateFee = (amount, selectedEarnings) => {
    if (selectedEarnings === "PACKAGE") {
        const fee = amount * 0.1;
        return fee;
    }
    else if (selectedEarnings === "REFERRAL") {
        const fee = amount * 0.1;
        return fee;
    }
    return 0;
};
