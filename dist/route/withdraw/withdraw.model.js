import { Prisma } from "@prisma/client";
import { calculateFee, calculateFinalAmount } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
export const withdrawModel = async (params) => {
    const { earnings, accountNumber, accountName, amount, bank, teamMemberProfile, } = params;
    const today = new Date().toISOString().slice(0, 10);
    const existingWithdrawal = await prisma.alliance_withdrawal_request_table.findFirst({
        where: {
            alliance_withdrawal_request_member_id: teamMemberProfile.alliance_member_id,
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
        throw new Error("You have already made a withdrawal today. Please try again tomorrow.");
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
    const { alliance_olympus_earnings, alliance_referral_bounty, alliance_combined_earnings, } = amountMatch;
    const amountValue = Math.round(Number(amount) * 100) / 100;
    const combinedEarnings = Math.round(Number(alliance_combined_earnings) * 100) / 100;
    if (amountValue > combinedEarnings) {
        throw new Error("Insufficient balance.");
    }
    let remainingAmount = Number(amount);
    const olympusDeduction = Math.min(remainingAmount, Number(alliance_olympus_earnings));
    remainingAmount -= olympusDeduction;
    const referralDeduction = Math.min(remainingAmount, Number(alliance_referral_bounty));
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
                alliance_withdrawal_request_member_id: teamMemberProfile.alliance_member_id,
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
                transaction_details: `Account Name: ${accountName}, Account Number: ${accountNumber}`,
                transaction_member_id: teamMemberProfile.alliance_member_id,
            },
        }),
    ]);
};
export const withdrawHistoryModel = async (params, teamMemberProfile) => {
    const { page, limit, search, columnAccessor, isAscendingSort, userId } = params;
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "ASC" : "DESC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const commonConditions = [
        Prisma.raw(`m.alliance_member_alliance_id = '${teamMemberProfile.alliance_member_alliance_id}'::uuid AND m.alliance_member_user_id = '${userId}'::uuid`),
    ];
    if (search) {
        commonConditions.push(Prisma.raw(`(
            u.user_username ILIKE '%${search}%'
            OR u.user_id::TEXT ILIKE '%${search}%'
            OR u.user_first_name ILIKE '%${search}%'
            OR u.user_last_name ILIKE '%${search}%'
          )`));
    }
    const dataQueryConditions = [...commonConditions];
    const dataWhereClause = Prisma.sql `${Prisma.join(dataQueryConditions, " AND ")}`;
    const withdrawals = await prisma.$queryRaw `
      SELECT 
        u.user_first_name,
        u.user_last_name,
        u.user_email,
        m.alliance_member_id,
        t.*
      FROM alliance_schema.alliance_withdrawal_request_table t
      JOIN alliance_schema.alliance_member_table m 
        ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
      JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      WHERE ${dataWhereClause}
      ${orderBy}
      LIMIT ${Prisma.raw(limit.toString())}
      OFFSET ${Prisma.raw(offset.toString())}
    `;
    const totalCount = await prisma.$queryRaw `
        SELECT 
          COUNT(*) AS count
        FROM alliance_schema.alliance_withdrawal_request_table t
        JOIN alliance_schema.alliance_member_table m 
          ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
        JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      WHERE ${dataWhereClause}
    `;
    return { data: withdrawals, totalCount: Number(totalCount[0].count) };
};
export const updateWithdrawModel = async (params) => {
    const { status, note, requestId, teamMemberProfile } = params;
    const result = await prisma.$transaction(async (tx) => {
        const existingRequest = await tx.alliance_withdrawal_request_table.findUnique({
            where: { alliance_withdrawal_request_id: requestId },
        });
        if (!existingRequest) {
            throw new Error("Request not found.");
        }
        const updatedRequest = await tx.alliance_withdrawal_request_table.update({
            where: { alliance_withdrawal_request_id: requestId },
            data: {
                alliance_withdrawal_request_status: status,
                alliance_withdrawal_request_approved_by: teamMemberProfile.alliance_member_id,
                alliance_withdrawal_request_reject_note: note ?? null,
            },
        });
        if (status === "REJECTED") {
            await tx.alliance_earnings_table.update({
                where: {
                    alliance_earnings_member_id: updatedRequest.alliance_withdrawal_request_member_id,
                },
                data: {
                    alliance_olympus_wallet: {
                        increment: updatedRequest.alliance_withdrawal_request_earnings_amount,
                    },
                    alliance_olympus_earnings: {
                        increment: updatedRequest.alliance_withdrawal_request_earnings_amount,
                    },
                    alliance_combined_earnings: {
                        increment: updatedRequest.alliance_withdrawal_request_amount,
                    },
                },
            });
        }
        await tx.alliance_transaction_table.create({
            data: {
                transaction_description: `Withdrawal ${status.slice(0, 1).toUpperCase() + status.slice(1).toLowerCase()} ${note ? `(${note})` : ""}`,
                transaction_details: `Account Name: ${updatedRequest.alliance_withdrawal_request_bank_name} | Account Number: ${updatedRequest.alliance_withdrawal_request_account}`,
                transaction_amount: updatedRequest.alliance_withdrawal_request_amount,
                transaction_member_id: updatedRequest.alliance_withdrawal_request_member_id,
            },
        });
        return updatedRequest;
    });
    return result;
};
export const withdrawListPostModel = async (params) => {
    const { parameters, teamMemberProfile } = params;
    let returnData = {
        data: {
            APPROVED: { data: [], count: BigInt(0) },
            REJECTED: { data: [], count: BigInt(0) },
            PENDING: { data: [], count: BigInt(0) },
        },
        totalCount: BigInt(0),
    };
    const { page, limit, search, columnAccessor, userFilter, statusFilter, isAscendingSort, dateFilter, } = parameters;
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "ASC" : "DESC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const commonConditions = [
        Prisma.raw(`m.alliance_member_alliance_id = '${teamMemberProfile.alliance_member_alliance_id}'::uuid`),
    ];
    if (userFilter) {
        commonConditions.push(Prisma.raw(`u.user_id::TEXT = '${userFilter}'`));
    }
    if (dateFilter?.start && dateFilter?.end) {
        const startDate = new Date(dateFilter.start).toISOString();
        const endDate = new Date(dateFilter.end).toISOString();
        commonConditions.push(Prisma.raw(`t.alliance_withdrawal_request_date::DATE BETWEEN '${startDate}'::DATE AND '${endDate}'::DATE`));
    }
    if (search) {
        commonConditions.push(Prisma.raw(`(
          u.user_username ILIKE '%${search}%'
          OR u.user_id::TEXT ILIKE '%${search}%'
          OR u.user_first_name ILIKE '%${search}%'
          OR u.user_last_name ILIKE '%${search}%'
        )`));
    }
    const dataQueryConditions = [...commonConditions];
    if (statusFilter) {
        dataQueryConditions.push(Prisma.raw(`t.alliance_withdrawal_request_status = '${statusFilter}'`));
    }
    const dataWhereClause = Prisma.sql `${Prisma.join(dataQueryConditions, " AND ")}`;
    const countWhereClause = Prisma.sql `${Prisma.join(commonConditions, " AND ")}`;
    const withdrawals = await prisma.$queryRaw `
    SELECT 
      u.user_id,
      u.user_first_name,
      u.user_last_name,
      u.user_email,
      u.user_username,
      m.alliance_member_id,
      t.*,
      approver.user_username AS approver_username
    FROM alliance_schema.alliance_withdrawal_request_table t
    JOIN alliance_schema.alliance_member_table m 
      ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
    JOIN user_schema.user_table u 
      ON u.user_id = m.alliance_member_user_id
    LEFT JOIN alliance_schema.alliance_member_table mt 
      ON mt.alliance_member_id = t.alliance_withdrawal_request_approved_by
    LEFT JOIN user_schema.user_table approver 
      ON approver.user_id = mt.alliance_member_user_id
    WHERE ${dataWhereClause}
    ${orderBy}
    LIMIT ${Prisma.raw(limit.toString())}
    OFFSET ${Prisma.raw(offset.toString())}
  `;
    const statusCounts = await prisma.$queryRaw `
      SELECT 
        t.alliance_top_up_request_status AS status, 
        COUNT(*) AS count
      FROM alliance_schema.alliance_withdrawal_request_table t
      JOIN alliance_schema.alliance_member_table m 
        ON t.alliance_withdrawal_request_member_id = m.alliance_member_id
      JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      LEFT JOIN alliance_schema.alliance_member_table mt 
        ON mt.alliance_member_id = t.alliance_withdrawal_request_approved_by
      LEFT JOIN user_schema.user_table approver 
        ON approver.user_id = mt.alliance_member_user_id
      WHERE ${countWhereClause}
      GROUP BY t.alliance_withdrawal_request_status
    `;
    ["APPROVED", "REJECTED", "PENDING"].forEach((status) => {
        const match = statusCounts.find((item) => item.status === status);
        returnData.data[status].count = match
            ? BigInt(match.count)
            : BigInt(0);
    });
    withdrawals.forEach((request) => {
        const status = request.alliance_withdrawal_request_status;
        if (returnData.data[status]) {
            returnData.data[status].data.push(request);
        }
    });
    returnData.totalCount = statusCounts.reduce((sum, item) => sum + BigInt(item.count), BigInt(0));
    return JSON.parse(JSON.stringify(returnData, (key, value) => typeof value === "bigint" ? value.toString() : value));
};
