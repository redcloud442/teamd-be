import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import {
  newReferralModelPost,
  referralDirectModelPost,
  referralIndirectModelPost,
  referralTotalGetModel,
} from "./referral.model.js";

export const referralDirectPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await referralDirectModelPost({
      ...params,
      teamMemberProfile,
    });

    return c.json(data);
  } catch (error) {
    return sendErrorResponse("Invalid data", 400);
  }
};

export const referralIndirectPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await referralIndirectModelPost({
      ...params,
      teamMemberProfile,
    });

    return c.json(data);
  } catch (error) {
    return sendErrorResponse("Invalid data", 400);
  }
};

export const newReferralPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await newReferralModelPost({
      ...params,
      teamMemberProfile,
    });

    return c.json(data);
  } catch (error) {
    return sendErrorResponse("Invalid data", 400);
  }
};

export const referralTotalGetController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const { data } = await referralTotalGetModel({ teamMemberProfile });

    return c.json({ message: "Data fetched successfully", data });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
