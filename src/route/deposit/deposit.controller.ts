import type { Context } from "node:vm";
import { supabaseClient } from "../../utils/supabase.js";
import {
  depositHistoryPostModel,
  depositPostModel,
  depositPutModel,
} from "./deposit.model.js";

export const depositPostController = async (c: Context) => {
  const supabase = supabaseClient;

  const { TopUpFormValues, publicUrl } = await c.req.json();

  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const { amount, topUpMode, accountName, accountNumber } = TopUpFormValues;

    await depositPostModel({
      TopUpFormValues: { amount, topUpMode, accountName, accountNumber },
      publicUrl: publicUrl,
      teamMemberProfile: teamMemberProfile,
    });

    return c.json({ message: "Deposit Created" }, { status: 200 });
  } catch (e) {
    await supabase.storage.from("REQUEST_ATTACHMENTS").remove([publicUrl]);
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};

export const depositPutController = async (c: Context) => {
  try {
    const { status, note, requestId } = c.get("sanitizedData");
    const teamMemberProfile = c.get("teamMemberProfile");

    await depositPutModel({
      status,
      note,
      requestId,
      teamMemberProfile,
    });

    return c.json({ message: "Deposit Updated" }, { status: 200 });
  } catch (e) {
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};

export const depositHistoryPostController = async (c: Context) => {
  try {
    const {
      search,
      page,
      limit,
      columnAccessor,
      isAscendingSort,
      userId,
      sortBy,
      teamMemberId,
    } = await c.req.json();

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await depositHistoryPostModel({
      search,
      page,
      limit,
      columnAccessor,
      isAscendingSort,
      sortBy,
      userId,
      teamMemberId,
      teamMemberProfile,
    });

    return c.json(data, { status: 200 });
  } catch (e) {
    return c.json({ message: "Internal Server Error" }, { status: 500 });
  }
};
