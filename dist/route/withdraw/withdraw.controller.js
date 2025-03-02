import { sendErrorResponse } from "../../utils/function.js";
import {
  updateWithdrawModel,
  withdrawHistoryModel,
  withdrawHistoryReportPostModel,
  withdrawHistoryReportPostTotalModel,
  withdrawListPostModel,
  withdrawModel,
} from "./withdraw.model.js";
export const withdrawPostController = async (c) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");
    await withdrawModel({
      ...params,
      teamMemberProfile,
    });
    return c.json({ message: "Withdrawal successful" }, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
export const withdrawHistoryPostController = async (c) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");
    const data = await withdrawHistoryModel(params, teamMemberProfile);
    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
export const updateWithdrawPostController = async (c) => {
  try {
    const { status, note } = await c.req.json();
    const { id } = c.req.param();
    const teamMemberProfile = c.get("teamMemberProfile");
    await updateWithdrawModel({
      status,
      note,
      teamMemberProfile,
      requestId: id,
    });
    return c.json({ message: "Withdrawal updated" }, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
export const withdrawListPostController = async (c) => {
  try {
    const params = c.get("params");
    const teamMemberProfile = c.get("teamMemberProfile");
    const data = await withdrawListPostModel({
      parameters: params,
      teamMemberProfile,
    });
    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
export const withdrawHistoryReportPostController = async (c) => {
  try {
    const { dateFilter } = await c.req.json();
    const data = await withdrawHistoryReportPostModel({ dateFilter });
    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
export const withdrawTotalReportPostController = async (c) => {
  try {
    const params = c.get("params");
    const data = await withdrawHistoryReportPostTotalModel(params);
    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
