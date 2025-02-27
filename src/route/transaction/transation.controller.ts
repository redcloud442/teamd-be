import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import { transactionModelGet } from "./transaction.model.js";

export const transactionPostController = async (c: Context) => {
  try {
    const { limit, page } = await c.req.json();
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await transactionModelGet({
      limit,
      page,
      teamMemberProfile,
    });

    return c.json(data, 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
