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
    else if (selectedEarnings === "WINNING") {
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
    else if (selectedEarnings === "WINNING") {
        const fee = amount * 0.1;
        return fee;
    }
    return 0;
};
export const getPhilippinesTime = (date, time) => {
    // Adjust the date to Philippine Time (UTC+8)
    const philippinesOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    const adjustedDate = new Date(date.getTime() + philippinesOffset);
    // Set the start or end of the day based on the time parameter
    if (time === "start") {
        adjustedDate.setUTCHours(0, 0, 0, 0);
    }
    else {
        adjustedDate.setUTCHours(23, 59, 59, 999);
    }
    // Convert back to UTC for accurate comparisons
    const resultDate = new Date(adjustedDate.getTime() - philippinesOffset);
    // Return ISO string for database queries
    return resultDate.toISOString();
};
