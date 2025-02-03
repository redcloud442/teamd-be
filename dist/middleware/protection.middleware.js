import { sendErrorResponse } from "../utils/function.js";
import { getSupabase } from "./auth.middleware.js";
export const protectionMiddleware = async (c, next) => {
    const supabase = getSupabase(c);
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        return sendErrorResponse("Unauthorized", 401);
    }
    if (!data.user) {
        return sendErrorResponse("Unauthorized", 401);
    }
    c.set("user", data.user);
    await next();
};
