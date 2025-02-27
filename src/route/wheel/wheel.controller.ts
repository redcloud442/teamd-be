import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import {
  wheelGetModel,
  wheelPostModel,
  wheelPutModel,
  wheelPutSettingsModel,
} from "./wheel.model.js";

export const wheelPostController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const response = await wheelPostModel({ teamMemberProfile });

    return c.json(response, 200);
  } catch (error) {
    return sendErrorResponse("Internal server error", 500);
  }
};

export const wheelGetController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const response = await wheelGetModel({ teamMemberProfile });

    return c.json(response, 200);
  } catch (error) {
    return sendErrorResponse("Internal server error", 500);
  }
};

export const wheelPutController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");
    const params = c.get("params");

    const response = await wheelPutModel({
      teamMemberProfile,
      quantity: params.quantity,
    });

    return c.json(response, 200);
  } catch (error) {
    return sendErrorResponse("Internal server error", 500);
  }
};

export const wheelPutSettingsController = async (c: Context) => {
  try {
    const params = c.get("params");

    const response = await wheelPutSettingsModel({ params });

    return c.json(response, 200);
  } catch (error) {
    return sendErrorResponse("Internal server error", 500);
  }
};
