import { sendErrorResponse } from "../../utils/function.js";
import { merchantOptionsModel, userOptionsModel } from "./options.model.js";
export const userOptionsPostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userOptionsModel(params);
        return c.json(data);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const merchantOptionsPostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await merchantOptionsModel(params);
        return c.json(data);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
