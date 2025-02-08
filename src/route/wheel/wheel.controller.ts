import { sendErrorResponse } from "@/utils/function.js";
import type { Context } from "hono";
import { wheelPostModel } from "./wheel.model.js";

export const wheelPostController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const response = await wheelPostModel({ teamMemberProfile });

    return c.json(response, 200);
  } catch (error) {
    console.log(error);
    return sendErrorResponse("Internal server error", 500);
  }
};
