import type { Context } from "hono";
import { sendErrorResponse } from "../../utils/function.js";
import {
  updateWithdrawModel,
  withdrawHistoryModel,
  withdrawModel,
} from "./withdraw.model.js";

export const withdrawPostController = async (c: Context) => {
  try {
    const { earnings, accountNumber, accountName, amount, bank } =
      await c.req.json();

    const teamMemberProfile = c.get("teamMemberProfile");

    await withdrawModel({
      earnings,
      accountNumber,
      accountName,
      amount,
      bank,
      teamMemberProfile,
    });

    return c.json({ message: "Withdrawal successful" }, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const withdrawHistoryPostController = async (c: Context) => {
  try {
    const { page, limit, search, columnAccessor, isAscendingSort, userId } =
      await c.req.json();

    const teamMemberProfile = c.get("teamMemberProfile");

    const { withdrawals, totalCount } = await withdrawHistoryModel({
      page,
      limit,
      search,
      columnAccessor,
      isAscendingSort,
      userId,
      teamMemberProfile,
    });

    return c.json({ data: withdrawals, totalCount }, 200);
  } catch (e) {
    console.log(e);
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const updateWithdrawPostController = async (c: Context) => {
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
