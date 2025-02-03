import { Prisma } from "@prisma/client";
import {} from "../../schema/schema.js";
import prisma from "../../utils/prisma.js";
export const depositPostModel = async (params) => {
    const { amount, accountName, accountNumber, reference } = params.TopUpFormValues;
    const { publicUrl } = params;
    if (amount.length > 7 || amount.length < 3) {
        throw new Error("Invalid amount");
    }
    const merchantData = await prisma.merchant_table.findFirst({
        where: {
            merchant_account_name: accountName,
            merchant_account_number: accountNumber,
        },
        select: {
            merchant_account_name: true,
            merchant_account_number: true,
            merchant_account_type: true,
        },
    });
    if (!merchantData) {
        throw new Error("Invalid account name or number");
    }
    if (!merchantData) {
        throw new Error("Invalid account name or number");
    }
    await prisma.$transaction(async (tx) => {
        await tx.alliance_top_up_request_table.create({
            data: {
                alliance_top_up_request_amount: Number(amount),
                alliance_top_up_request_type: merchantData.merchant_account_type,
                alliance_top_up_request_name: accountName,
                alliance_top_up_request_account: accountNumber,
                alliance_top_up_request_attachment: publicUrl,
                alliance_top_up_request_member_id: params.teamMemberProfile.alliance_member_id,
                alliance_top_up_request_reference_number: reference,
            },
        });
        await tx.alliance_transaction_table.create({
            data: {
                transaction_amount: Number(amount),
                transaction_description: "Deposit Pending",
                transaction_details: `Account Name: ${accountName} | Account Number: ${accountNumber}`,
                transaction_member_id: params.teamMemberProfile.alliance_member_id,
            },
        });
    });
};
export const depositPutModel = async (params) => {
    const { status, note, requestId, teamMemberProfile } = params;
    const merchant = await prisma.merchant_member_table.findFirst({
        where: {
            merchant_member_merchant_id: teamMemberProfile.alliance_member_id,
        },
    });
    if (!merchant && teamMemberProfile.alliance_member_role === "MERCHANT")
        throw new Error("Merchant not found.");
    return await prisma.$transaction(async (tx) => {
        const existingDeposit = await prisma.alliance_top_up_request_table.findFirst({
            where: {
                alliance_top_up_request_member_id: teamMemberProfile.alliance_member_id,
                alliance_top_up_request_status: "PENDING",
            },
            take: 1,
            orderBy: {
                alliance_top_up_request_date: "desc",
            },
            select: {
                alliance_top_up_request_id: true,
            },
        });
        if (existingDeposit) {
            throw new Error("You cannot make a new deposit request.");
        }
        const existingRequest = await tx.alliance_top_up_request_table.findUnique({
            where: {
                alliance_top_up_request_id: requestId,
            },
        });
        if (!existingRequest) {
            throw new Error("Request not found.");
        }
        const updatedRequest = await tx.alliance_top_up_request_table.update({
            where: { alliance_top_up_request_id: requestId },
            data: {
                alliance_top_up_request_status: status,
                alliance_top_up_request_approved_by: teamMemberProfile.alliance_member_id,
                alliance_top_up_request_reject_note: note ?? null,
                alliance_top_up_request_date_updated: new Date(),
            },
        });
        await tx.alliance_transaction_table.create({
            data: {
                transaction_description: `Deposit ${status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()} ${note ? `(${note})` : ""}`,
                transaction_details: `Account Name: ${updatedRequest.alliance_top_up_request_name}, Account Number: ${updatedRequest.alliance_top_up_request_account}`,
                transaction_amount: updatedRequest.alliance_top_up_request_amount,
                transaction_member_id: updatedRequest.alliance_top_up_request_member_id,
            },
        });
        if (status === "APPROVED") {
            const updatedEarnings = await tx.alliance_earnings_table.upsert({
                where: {
                    alliance_earnings_member_id: updatedRequest.alliance_top_up_request_member_id,
                },
                create: {
                    alliance_earnings_member_id: updatedRequest.alliance_top_up_request_member_id,
                    alliance_olympus_wallet: updatedRequest.alliance_top_up_request_amount,
                    alliance_combined_earnings: updatedRequest.alliance_top_up_request_amount,
                },
                update: {
                    alliance_olympus_wallet: {
                        increment: updatedRequest.alliance_top_up_request_amount,
                    },
                    alliance_combined_earnings: {
                        increment: updatedRequest.alliance_top_up_request_amount,
                    },
                },
            });
            if (merchant && status === "APPROVED") {
                if (updatedRequest.alliance_top_up_request_amount >
                    merchant.merchant_member_balance) {
                    throw new Error("Insufficient balance. Cannot proceed with the update.");
                }
                const updatedMerchant = await tx.merchant_member_table.update({
                    where: { merchant_member_id: merchant.merchant_member_id },
                    data: {
                        merchant_member_balance: {
                            decrement: updatedRequest.alliance_top_up_request_amount,
                        },
                    },
                });
                return {
                    updatedRequest,
                    updatedEarnings,
                    updatedMerchant,
                };
            }
        }
        else {
            return { updatedRequest };
        }
    });
};
export const depositHistoryPostModel = async (params, teamMemberProfile) => {
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
    const depositHistory = await prisma.$queryRaw `
      SELECT 
        u.user_first_name,
        u.user_last_name,
        u.user_email,
        m.alliance_member_id,
        t.*
      FROM alliance_schema.alliance_top_up_request_table t
      JOIN alliance_schema.alliance_member_table m 
        ON t.alliance_top_up_request_member_id = m.alliance_member_id
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
        FROM alliance_schema.alliance_top_up_request_table t
        JOIN alliance_schema.alliance_member_table m 
          ON t.alliance_top_up_request_member_id = m.alliance_member_id
        JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      WHERE ${dataWhereClause}
    `;
    return { data: depositHistory, totalCount: Number(totalCount[0].count) };
};
export const depositListPostModel = async (params, teamMemberProfile) => {
    const { page, limit, search, isAscendingSort, columnAccessor, merchantFilter, userFilter, statusFilter, dateFilter, } = params;
    let returnData = {
        data: {
            APPROVED: { data: [], count: BigInt(0) },
            REJECTED: { data: [], count: BigInt(0) },
            PENDING: { data: [], count: BigInt(0) },
        },
        totalCount: BigInt(0),
    };
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "DESC" : "ASC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const commonConditions = [
        Prisma.raw(`m.alliance_member_alliance_id = '${teamMemberProfile.alliance_member_alliance_id}'::uuid`),
    ];
    if (merchantFilter) {
        commonConditions.push(Prisma.raw(`approver.user_id::TEXT = '${merchantFilter}'`));
    }
    if (userFilter) {
        commonConditions.push(Prisma.raw(`u.user_id::TEXT = '${userFilter}'`));
    }
    if (dateFilter?.start && dateFilter?.end) {
        const startDate = new Date(dateFilter.start).toISOString();
        const endDate = new Date(dateFilter.end).toISOString();
        commonConditions.push(Prisma.raw(`t.alliance_top_up_request_date::DATE BETWEEN '${startDate}'::DATE AND '${endDate}'::DATE`));
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
        dataQueryConditions.push(Prisma.raw(`t.alliance_top_up_request_status = '${statusFilter}'`));
    }
    const dataWhereClause = Prisma.sql `${Prisma.join(dataQueryConditions, " AND ")}`;
    const countWhereClause = Prisma.sql `${Prisma.join(commonConditions, " AND ")}`;
    const topUpRequests = await prisma.$queryRaw `
    SELECT 
      u.user_id,
      u.user_first_name,
      u.user_last_name,
      u.user_email,
      u.user_username,
      m.alliance_member_id,
      t.*,
      approver.user_username AS approver_username
    FROM alliance_schema.alliance_top_up_request_table t
    JOIN alliance_schema.alliance_member_table m 
      ON t.alliance_top_up_request_member_id = m.alliance_member_id
    JOIN user_schema.user_table u 
      ON u.user_id = m.alliance_member_user_id
    LEFT JOIN alliance_schema.alliance_member_table mt 
      ON mt.alliance_member_id = t.alliance_top_up_request_approved_by
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
      FROM alliance_schema.alliance_top_up_request_table t
      JOIN alliance_schema.alliance_member_table m 
        ON t.alliance_top_up_request_member_id = m.alliance_member_id
      JOIN user_schema.user_table u 
        ON u.user_id = m.alliance_member_user_id
      LEFT JOIN alliance_schema.alliance_member_table mt 
        ON mt.alliance_member_id = t.alliance_top_up_request_approved_by
      LEFT JOIN user_schema.user_table approver 
        ON approver.user_id = mt.alliance_member_user_id
      WHERE ${countWhereClause}
      GROUP BY t.alliance_top_up_request_status
    `;
    ["APPROVED", "REJECTED", "PENDING"].forEach((status) => {
        const match = statusCounts.find((item) => item.status === status);
        returnData.data[status].count = match
            ? BigInt(match.count)
            : BigInt(0);
    });
    topUpRequests.forEach((request) => {
        const status = request.alliance_top_up_request_status;
        if (returnData.data[status]) {
            returnData.data[status].data.push(request);
        }
    });
    returnData.totalCount = statusCounts.reduce((sum, item) => sum + BigInt(item.count), BigInt(0));
    if (teamMemberProfile.alliance_member_role === "MERCHANT") {
        const merchant = await prisma.merchant_member_table.findFirst({
            where: {
                merchant_member_merchant_id: teamMemberProfile.alliance_member_id,
            },
            select: {
                merchant_member_balance: true,
            },
        });
        returnData.merchantBalance = merchant?.merchant_member_balance;
    }
    return JSON.parse(JSON.stringify(returnData, (key, value) => typeof value === "bigint" ? value.toString() : value));
};
export const depositReferencePostModel = async (params) => {
    const { reference } = params;
    const deposit = await prisma.alliance_top_up_request_table.findFirst({
        where: {
            alliance_top_up_request_reference_number: reference,
        },
    });
    return deposit ? true : false;
};
