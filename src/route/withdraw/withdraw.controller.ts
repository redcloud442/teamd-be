import type { Context } from "hono";
import {
  invalidateCache,
  invalidateCacheVersion,
  sendErrorResponse,
} from "../../utils/function.js";
import {
  hideAllWithdrawModel,
  updateWithdrawModel,
  withdrawHideUserModel,
  withdrawHistoryModel,
  withdrawHistoryReportPostModel,
  withdrawHistoryReportPostTotalModel,
  withdrawListExportPostModel,
  withdrawListPostModel,
  withdrawModel,
  withdrawUserGetModel,
} from "./withdraw.model.js";

export const withdrawPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    await withdrawModel({
      ...params,
      teamMemberProfile,
    });

    await Promise.all([
      invalidateCacheVersion(
        `transaction:${teamMemberProfile.company_member_id}:WITHDRAWAL`
      ),
      invalidateCache(`user-model-get-${teamMemberProfile.company_member_id}`),
    ]);

    return c.json({ message: "Withdrawal successful" }, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawHistoryPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    console.log(params);
    const data = await withdrawHistoryModel(params, teamMemberProfile);

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const updateWithdrawPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await updateWithdrawModel({
      ...params,
      teamMemberProfile,
    });

    await Promise.all([
      invalidateCacheVersion(
        `transaction:${data?.company_withdrawal_request_member_id}:WITHDRAWAL`
      ),
      invalidateCache(
        `user-model-get-${data?.company_withdrawal_request_member_id}`
      ),
    ]);

    return c.json({ message: "Withdrawal updated" }, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawListPostController = async (c: Context) => {
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

export const withdrawHistoryReportPostController = async (c: Context) => {
  try {
    const { dateFilter } = await c.req.json();

    const data = await withdrawHistoryReportPostModel({ dateFilter });

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawTotalReportPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const data = await withdrawHistoryReportPostTotalModel(params);

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawHideUserPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    await withdrawHideUserModel({
      id: params.id,
      type: params.type,
      teamMemberProfile,
    });

    await invalidateCacheVersion(`user-list`);

    return c.json({ message: "User hidden" }, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawUserGetController = async (c: Context) => {
  try {
    const params = c.get("params");

    const data = await withdrawUserGetModel(params);

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawListExportPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await withdrawListExportPostModel({
      ...params,
      teamMemberProfile,
    });

    return c.json(data, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const hideAllWithdrawPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await hideAllWithdrawModel({
      ...params,
      teamMemberProfile,
    });

    return c.json(data, 200);
  } catch (e) {
    console.log(e);
    return sendErrorResponse("Internal Server Error", 500);
  }
};
