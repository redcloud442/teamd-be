import type { alliance_member_table } from "@prisma/client";
import { calculateFee, calculateFinalAmount } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { supabaseClient } from "../../utils/supabase.js";

export const withdrawModel = async (params: {
  earnings: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  bank: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const {
    earnings,
    accountNumber,
    accountName,
    amount,
    bank,
    teamMemberProfile,
  } = params;

  const today = new Date().toISOString().slice(0, 10);

  const existingWithdrawal =
    await prisma.alliance_withdrawal_request_table.findFirst({
      where: {
        alliance_withdrawal_request_member_id:
          teamMemberProfile.alliance_member_id,
        AND: [
          {
            alliance_withdrawal_request_date: {
              gte: new Date(`${today}T00:00:00Z`), // Start of the day
            },
          },
          {
            alliance_withdrawal_request_date: {
              lte: new Date(`${today}T23:59:59Z`), // End of the day
            },
          },
        ],
      },
    });

  if (existingWithdrawal) {
    throw new Error(
      "You have already made a withdrawal today. Please try again tomorrow."
    );
  }

  const amountMatch = await prisma.alliance_earnings_table.findUnique({
    where: {
      alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
    },
    select: {
      alliance_olympus_earnings: true,
      alliance_referral_bounty: true,
      alliance_combined_earnings: true,
    },
  });

  if (!amountMatch || !teamMemberProfile?.alliance_member_is_active) {
    throw new Error("Invalid request.");
  }

  const {
    alliance_olympus_earnings,
    alliance_referral_bounty,
    alliance_combined_earnings,
  } = amountMatch;

  const amountValue = Math.round(Number(amount) * 100) / 100;
  const combinedEarnings =
    Math.round(Number(alliance_combined_earnings) * 100) / 100;

  if (amountValue > combinedEarnings) {
    throw new Error("Insufficient balance.");
  }

  let remainingAmount = Number(amount);
  const olympusDeduction = Math.min(
    remainingAmount,
    Number(alliance_olympus_earnings)
  );
  remainingAmount -= olympusDeduction;

  const referralDeduction = Math.min(
    remainingAmount,
    Number(alliance_referral_bounty)
  );
  remainingAmount -= referralDeduction;

  if (remainingAmount > 0) {
    throw new Error("Invalid request.");
  }

  const finalAmount = calculateFinalAmount(Number(amount), "TOTAL");
  const fee = calculateFee(Number(amount), "TOTAL");

  await prisma.$transaction([
    // Create the withdrawal request
    prisma.alliance_withdrawal_request_table.create({
      data: {
        alliance_withdrawal_request_amount: Number(amount),
        alliance_withdrawal_request_type: bank,
        alliance_withdrawal_request_account: accountNumber,
        alliance_withdrawal_request_fee: fee,
        alliance_withdrawal_request_withdraw_amount: finalAmount,
        alliance_withdrawal_request_bank_name: accountName,
        alliance_withdrawal_request_status: "PENDING",
        alliance_withdrawal_request_member_id:
          teamMemberProfile.alliance_member_id,
        alliance_withdrawal_request_earnings_amount: olympusDeduction,
        alliance_withdrawal_request_referral_amount: referralDeduction,
        alliance_withdrawal_request_withdraw_type: earnings,
      },
    }),

    // Update the earnings
    prisma.alliance_earnings_table.update({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
      data: {
        alliance_olympus_earnings: {
          decrement: olympusDeduction,
        },
        alliance_referral_bounty: {
          decrement: referralDeduction,
        },
        alliance_combined_earnings: {
          decrement: Number(amount),
        },
      },
    }),

    // Log the transaction
    prisma.alliance_transaction_table.create({
      data: {
        transaction_amount: finalAmount,
        transaction_description: "Withdrawal Pending",
        transaction_details: `Account Name: ${accountName} | Account Number: ${accountNumber}`,
        transaction_member_id: teamMemberProfile.alliance_member_id,
      },
    }),
  ]);
};

export const withdrawHistoryModel = async (params: {
  page: string;
  limit: string;
  search: string;
  columnAccessor: string;
  isAscendingSort: string;
  userId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const supabase = supabaseClient;
  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    userId,
    teamMemberProfile,
  } = params;

  const inputData = {
    page: page,
    limit: limit,
    search,
    columnAccessor,
    userId: userId ? userId : teamMemberProfile?.alliance_member_id || "",
    isAscendingSort: isAscendingSort === "true",
    teamId: teamMemberProfile?.alliance_member_alliance_id || "",
  };

  const { data, error } = await supabase.rpc("get_member_withdrawal_history", {
    input_data: inputData,
  });

  if (error) throw error;

  const { data: withdrawals, totalCount } = data;

  return { withdrawals, totalCount };
};

export const updateWithdrawModel = async (params: {
  status: string;
  note: string;
  requestId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const { status, note, requestId, teamMemberProfile } = params;

  const result = await prisma.$transaction(async (tx) => {
    const existingRequest =
      await tx.alliance_withdrawal_request_table.findUnique({
        where: { alliance_withdrawal_request_id: requestId },
      });

    if (!existingRequest) {
      throw new Error("Request not found.");
    }

    const updatedRequest = await tx.alliance_withdrawal_request_table.update({
      where: { alliance_withdrawal_request_id: requestId },
      data: {
        alliance_withdrawal_request_status: status,
        alliance_withdrawal_request_approved_by:
          teamMemberProfile.alliance_member_id,
        alliance_withdrawal_request_reject_note: note ?? null,
      },
    });

    if (status === "REJECTED") {
      await tx.alliance_earnings_table.update({
        where: {
          alliance_earnings_member_id:
            updatedRequest.alliance_withdrawal_request_member_id,
        },
        data: {
          alliance_olympus_wallet: {
            increment:
              updatedRequest.alliance_withdrawal_request_earnings_amount,
          },
          alliance_olympus_earnings: {
            increment:
              updatedRequest.alliance_withdrawal_request_earnings_amount,
          },
          alliance_combined_earnings: {
            increment: updatedRequest.alliance_withdrawal_request_amount,
          },
        },
      });
    }

    await tx.alliance_transaction_table.create({
      data: {
        transaction_description: `Withdrawal ${
          status.slice(0, 1).toUpperCase() + status.slice(1).toLowerCase()
        } ${note ? `(${note})` : ""}`,
        transaction_details: `Account Name: ${updatedRequest.alliance_withdrawal_request_bank_name} | Account Number: ${updatedRequest.alliance_withdrawal_request_account}`,
        transaction_amount: updatedRequest.alliance_withdrawal_request_amount,
        transaction_member_id:
          updatedRequest.alliance_withdrawal_request_member_id,
      },
    });

    return updatedRequest;
  });

  return result;
};
