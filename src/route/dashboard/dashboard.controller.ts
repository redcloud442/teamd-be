import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import { dashboardGetModel, dashboardPostModel } from "./dashboard.model.js";

export const dashboardPostController = async (c: Context) => {
  try {
    const dateFilter = c.get("dateFilter");

    const response = await dashboardPostModel({ dateFilter });

    return c.json(response, 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const dashboardGetController = async (c: Context) => {
  try {
    const data = await dashboardGetModel();

    return c.json(data, 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
