import { sendErrorResponse } from "../../utils/function.js";
import { leaderboardPostModel } from "./leaderboard.model.js";
export const leaderboardPostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await leaderboardPostModel(params);
        return c.json(data, 200);
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse("Internal Server Error", 500);
    }
};
