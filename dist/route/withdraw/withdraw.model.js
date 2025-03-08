import { Prisma } from "@prisma/client";
import { calculateFee, calculateFinalAmount, getPhilippinesTime, } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
export const withdrawModel = async (params) => {
    const { earnings, accountNumber, accountName, amount, bank, teamMemberProfile, } = params;
    const startDate = getPhilippinesTime(new Date(), "start");
    const endDate = getPhilippinesTime(new Date(), "end");
    const existingPackageWithdrawal = await prisma.alliance_withdrawal_request_table.findFirst({
        where: {
            alliance_withdrawal_request_member_id: teamMemberProfile.alliance_member_id,
            alliance_withdrawal_request_status: {
                in: ["PENDING", "APPROVED"],
            },
            alliance_withdrawal_request_withdraw_type: earnings,
            alliance_withdrawal_request_date: {
                gte: getPhilippinesTime(new Date(new Date()), "start"),
                lte: getPhilippinesTime(new Date(new Date()), "end"),
            },
        },
    });
    if (existingPackageWithdrawal) {
        throw new Error(`You have already made a ${existingPackageWithdrawal.alliance_withdrawal_request_withdraw_type} withdrawal today. Please try again tomorrow.`);
    }
    const amountMatch = await prisma.alliance_earnings_table.findUnique({
        where: {
            alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
        },
        select: {
            alliance_olympus_earnings: true,
            alliance_referral_bounty: true,
            alliance_combined_earnings: true,
            alliance_winning_earnings: true,
        },
    });
    if (!amountMatch) {
        throw new Error("Invalid request.");
    }
    const { alliance_olympus_earnings, alliance_referral_bounty, alliance_winning_earnings, } = amountMatch;
    const amountValue = Math.round(Number(amount) * 100) / 100;
    const earningsType = earnings === "PACKAGE"
        ? "alliance_olympus_earnings"
        : earnings === "REFERRAL"
            ? "alliance_referral_bounty"
            : "alliance_winning_earnings";
    const earningsWithdrawalType = earnings === "PACKAGE"
        ? "alliance_withdrawal_request_earnings_amount"
        : earnings === "REFERRAL"
            ? "alliance_withdrawal_request_referral_amount"
            : "alliance_withdrawal_request_winning_amount";
    const earningsValue = Math.round(Number(amountMatch[earningsType]) * 100) / 100;
    if (amountValue > earningsValue) {
        throw new Error("Insufficient balance.");
    }
    let remainingAmount = Number(amount);
    if (earnings === "PACKAGE") {
        const olympusDeduction = Math.min(remainingAmount, Number(alliance_olympus_earnings));
        remainingAmount -= olympusDeduction;
    }
    if (earnings === "REFERRAL") {
        const referralDeduction = Math.min(remainingAmount, Number(alliance_referral_bounty));
        remainingAmount -= referralDeduction;
    }
    if (earnings === "WINNING") {
        const winningDeduction = Math.min(remainingAmount, Number(alliance_winning_earnings));
        remainingAmount -= winningDeduction;
    }
    const finalAmount = calculateFinalAmount(Number(amount), earnings);
    const fee = calculateFee(Number(amount), earnings);
    await prisma.$transaction(async (tx) => {
        const countAllRequests = await tx.$queryRaw `
      SELECT am.alliance_member_id AS "approverId",
             COALESCE(approvedRequests."requestCount", 0) AS "requestCount"
      FROM alliance_schema.alliance_member_table am
      LEFT JOIN (
        SELECT awr.alliance_withdrawal_request_approved_by AS "approverId",
               COUNT(awr.alliance_withdrawal_request_id) AS "requestCount"
        FROM alliance_schema.alliance_withdrawal_request_table awr
        WHERE awr.alliance_withdrawal_request_date::timestamptz BETWEEN ${startDate}::timestamptz AND ${endDate}::timestamptz
        GROUP BY awr.alliance_withdrawal_request_approved_by
      ) approvedRequests ON am.alliance_member_id = approvedRequests."approverId"
      WHERE am.alliance_member_role IN ('ACCOUNTING', 'ACCOUNTING_HEAD')
      ORDER BY "requestCount" ASC
      LIMIT 1;
    `;
        await tx.alliance_withdrawal_request_table.create({
            data: {
                alliance_withdrawal_request_amount: Number(amount),
                alliance_withdrawal_request_type: bank,
                alliance_withdrawal_request_account: accountNumber,
                alliance_withdrawal_request_fee: fee,
                alliance_withdrawal_request_withdraw_amount: finalAmount,
                alliance_withdrawal_request_bank_name: accountName,
                alliance_withdrawal_request_status: "PENDING",
                [earningsWithdrawalType]: finalAmount,
                alliance_withdrawal_request_member_id: teamMemberProfile.alliance_member_id,
                alliance_withdrawal_request_withdraw_type: earnings,
                alliance_withdrawal_request_approved_by: countAllRequests[0]?.approverId ?? null,
            },
        });
        // Update the earnings
        await tx.$executeRaw(Prisma.sql `
        UPDATE alliance_schema.alliance_earnings_table
        SET 
          ${Prisma.raw(earningsType)} = GREATEST(0, ${Prisma.raw(earningsType)} - ${Math.trunc(Number(amount) * 100) / 100}),
          alliance_combined_earnings = GREATEST(0, alliance_combined_earnings - ${Math.trunc(Number(amount) * 100) / 100})
        WHERE alliance_earnings_member_id = ${teamMemberProfile.alliance_member_id}::uuid;
      `);
        // Log the transaction
        await tx.alliance_transaction_table.create({
            data: {
                transaction_amount: finalAmount,
                transaction_description: `Withdrawal ${earnings === "PACKAGE"
                    ? "Package"
                    : earnings === "REFERRAL"
                        ? "Referral"
                        : "Winning"} Ongoing.`,
                transaction_details: `Account Name: ${accountName}, Account Number: ${accountNumber}`,
                transaction_member_id: teamMemberProfile.alliance_member_id,
            },
        });
    });
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
        if (existingRequest.alliance_withdrawal_request_status !== "PENDING") {
            throw new Error("Request has already been processed.");
        }
        if (teamMemberProfile.alliance_member_id !==
            existingRequest.alliance_withdrawal_request_approved_by &&
            teamMemberProfile.alliance_member_role === "ACCOUNTING") {
            throw new Error("You are not authorized to update this request.");
        }
        const updatedRequest = await tx.alliance_withdrawal_request_table.update({
            where: { alliance_withdrawal_request_id: requestId },
            data: {
                alliance_withdrawal_request_status: status,
                alliance_withdrawal_request_approved_by: teamMemberProfile.alliance_member_role === "ADMIN"
                    ? teamMemberProfile.alliance_member_id
                    : undefined,
                alliance_withdrawal_request_reject_note: note ?? null,
                alliance_withdrawal_request_date_updated: new Date(),
            },
        });
        if (status === "REJECTED") {
            const earningsType = updatedRequest.alliance_withdrawal_request_withdraw_type === "PACKAGE"
                ? "alliance_olympus_earnings"
                : "alliance_referral_bounty";
            await tx.alliance_earnings_table.update({
                where: {
                    alliance_earnings_member_id: updatedRequest.alliance_withdrawal_request_member_id,
                },
                data: {
                    [earningsType]: {
                        increment: updatedRequest.alliance_withdrawal_request_amount,
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
                transaction_details: `Account Name: ${updatedRequest.alliance_withdrawal_request_bank_name}, Account Number: ${updatedRequest.alliance_withdrawal_request_account}`,
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
        totalWithdrawals: {
            amount: 0,
            approvedAmount: 0,
        },
    };
    const { page, limit, search, columnAccessor, userFilter, statusFilter, isAscendingSort, dateFilter, showHiddenUser, } = parameters;
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "DESC" : "ASC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const commonConditions = [
        Prisma.raw(`m.alliance_member_alliance_id = '${teamMemberProfile.alliance_member_alliance_id}'::uuid AND t.alliance_withdrawal_request_member_id ${showHiddenUser ? "IN" : "NOT IN"} (SELECT alliance_hidden_user_member_id FROM alliance_schema.alliance_hidden_user_table)`),
    ];
    if (teamMemberProfile.alliance_member_role === "ACCOUNTING" ||
        teamMemberProfile.alliance_member_role === "ACCOUNTING_HEAD") {
        commonConditions.push(Prisma.raw(`t.alliance_withdrawal_request_approved_by = '${teamMemberProfile.alliance_member_id}'::uuid`));
    }
    if (userFilter) {
        commonConditions.push(Prisma.raw(`u.user_id::TEXT = '${userFilter}'`));
    }
    if (dateFilter?.start && dateFilter?.end) {
        const startDate = new Date(dateFilter.start || new Date()).toISOString().split("T")[0] +
            " 00:00:00.000";
        const endDate = new Date(dateFilter.end || new Date()).toISOString().split("T")[0] +
            " 23:59:59.999";
        commonConditions.push(Prisma.raw(`t.alliance_withdrawal_request_date_updated::timestamptz at time zone 'Asia/Manila' BETWEEN '${startDate}'::timestamptz AND '${endDate}'::timestamptz`));
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
        t.alliance_withdrawal_request_status AS status, 
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
    if (teamMemberProfile.alliance_member_role === "ACCOUNTING_HEAD") {
        const aggregateResult = await prisma.alliance_withdrawal_request_table.aggregate({
            where: {
                alliance_withdrawal_request_status: "PENDING",
                alliance_withdrawal_request_date: {
                    gte: getPhilippinesTime(new Date(new Date()), "start"),
                    lte: getPhilippinesTime(new Date(new Date()), "end"),
                },
            },
            _sum: {
                alliance_withdrawal_request_amount: true,
                alliance_withdrawal_request_fee: true,
            },
        });
        const totalApprovedCount = await prisma.alliance_withdrawal_request_table.aggregate({
            where: {
                alliance_withdrawal_request_status: "APPROVED",
                alliance_withdrawal_request_date: {
                    gte: getPhilippinesTime(new Date(new Date()), "start"),
                    lte: getPhilippinesTime(new Date(new Date()), "end"),
                },
            },
            _sum: {
                alliance_withdrawal_request_amount: true,
                alliance_withdrawal_request_fee: true,
            },
        });
        returnData.totalWithdrawals = {
            amount: Number(aggregateResult._sum.alliance_withdrawal_request_amount || 0) -
                Number(aggregateResult._sum.alliance_withdrawal_request_fee || 0),
            approvedAmount: Number(totalApprovedCount._sum.alliance_withdrawal_request_amount || 0) -
                Number(totalApprovedCount._sum.alliance_withdrawal_request_fee || 0),
        };
    }
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
export const withdrawHistoryReportPostTotalModel = async (params) => {
    const { take, skip, type } = params;
    // Helper function to adjust the date based on the type and skip count
    const adjustDate = (date, type, skip) => {
        const adjustedDate = new Date(date);
        switch (type) {
            case "DAILY":
                adjustedDate.setDate(adjustedDate.getDate() - skip);
                break;
            case "WEEKLY":
                adjustedDate.setDate(adjustedDate.getDate() - 7 * skip);
                break;
            case "MONTHLY":
                adjustedDate.setMonth(adjustedDate.getMonth() - skip);
                adjustedDate.setDate(1); // Set to the first day of the month
                break;
            default:
                throw new Error("Invalid type provided");
        }
        return adjustedDate;
    };
    const generateIntervals = (type, take, currentEnd) => {
        const intervals = [];
        for (let i = 0; i < take; i++) {
            const intervalEnd = new Date(currentEnd);
            let intervalStart = new Date(currentEnd);
            switch (type) {
                case "DAILY":
                    intervalStart.setDate(intervalStart.getDate() - 1); // Shift back one full day
                    break;
                case "WEEKLY":
                    intervalStart.setDate(intervalStart.getDate() - 8);
                    break;
                case "MONTHLY":
                    intervalStart.setMonth(intervalStart.getMonth() - 1);
                    intervalStart.setDate(1);
                    break;
            }
            intervalStart.setUTCHours(16, 1, 1, 1); // 12:01:01 AM PH Time (UTC+8)
            intervalEnd.setUTCHours(15, 59, 59, 999); // 11:59:59.999 PM PH Time (UTC+8)
            intervals.push({
                start: intervalStart.toISOString(),
                end: intervalEnd.toISOString(),
            });
            // Move `currentEnd` backward for the next iteration
            switch (type) {
                case "DAILY":
                    currentEnd.setDate(currentEnd.getDate() - 1);
                    break;
                case "WEEKLY":
                    currentEnd.setDate(currentEnd.getDate() - 7);
                    break;
                case "MONTHLY":
                    currentEnd.setMonth(currentEnd.getMonth() - 1);
                    currentEnd.setDate(1);
                    break;
            }
            currentEnd.setUTCHours(15, 59, 59, 999); // Maintain PH Time format
        }
        return intervals;
    };
    // Helper function to execute the query for each interval
    const executeQuery = async (interval) => {
        const reportData = await prisma.$queryRaw `
      WITH approval_summary AS (
        SELECT 
          t.alliance_withdrawal_request_id,
          CASE 
            WHEN mr.alliance_member_role = 'ADMIN' THEN 'ADMIN'
            WHEN mt.alliance_member_role = 'ACCOUNTING' THEN 'ACCOUNTING'
          END AS approver_role,
          t.alliance_withdrawal_request_amount - t.alliance_withdrawal_request_fee AS net_approved_amount
        FROM alliance_schema.alliance_withdrawal_request_table t
        LEFT JOIN alliance_schema.alliance_member_table mt 
          ON mt.alliance_member_id = t.alliance_withdrawal_request_approved_by
          AND mt.alliance_member_role = 'ACCOUNTING'
        LEFT JOIN alliance_schema.alliance_member_table mr 
          ON mr.alliance_member_id = t.alliance_withdrawal_request_approved_by
          AND mr.alliance_member_role = 'ADMIN'
        WHERE t.alliance_withdrawal_request_date_updated::timestamptz BETWEEN ${interval.start}::timestamptz AND ${interval.end}::timestamptz
          AND t.alliance_withdrawal_request_status = 'APPROVED'
      ),
      role_aggregates AS (
        SELECT 
          approver_role,
          COUNT(*) AS total_approvals,
          SUM(net_approved_amount) AS total_approved_amount
        FROM approval_summary
        GROUP BY approver_role
      )

      SELECT 
        ${interval.start} AS interval_start,
        ${interval.end} AS interval_end,
        COALESCE((SELECT total_approvals FROM role_aggregates WHERE approver_role = 'ACCOUNTING'), 0) AS total_accounting_approvals,
        COALESCE((SELECT total_approvals FROM role_aggregates WHERE approver_role = 'ADMIN'), 0) AS total_admin_approvals,
        COALESCE((SELECT total_approved_amount FROM role_aggregates WHERE approver_role = 'ADMIN'), 0) AS total_admin_approved_amount,
        COALESCE((SELECT total_approved_amount FROM role_aggregates WHERE approver_role = 'ACCOUNTING'), 0) AS total_accounting_approved_amount,
        COALESCE((SELECT SUM(net_approved_amount) FROM approval_summary), 0) AS total_net_approved_amount
    `;
        return (reportData[0] || {
            interval_start: interval.start,
            interval_end: interval.end,
            total_accounting_approvals: 0,
            total_admin_approvals: 0,
            total_admin_approved_amount: 0,
            total_accounting_approved_amount: 0,
            total_net_approved_amount: 0,
        });
    };
    // Main logic
    let currentEnd = new Date();
    currentEnd.setDate(currentEnd.getDate() + 1);
    currentEnd.setUTCHours(23, 59, 59, 999); // Set time to 11:59:59.999 PM
    currentEnd = adjustDate(currentEnd, type, skip);
    const intervals = generateIntervals(type, take, currentEnd);
    const aggregatedResults = await Promise.all(intervals.map((interval) => executeQuery({
        start: new Date(interval.start),
        end: new Date(interval.end),
    })));
    return JSON.parse(JSON.stringify(aggregatedResults, (key, value) => typeof value === "bigint" ? value.toString() : value));
};
export const withdrawHistoryReportPostModel = async (params) => {
    const { dateFilter } = params;
    const { startDate, endDate } = dateFilter;
    const withdrawalData = await prisma.alliance_withdrawal_request_table.aggregate({
        where: {
            alliance_withdrawal_request_date: {
                gte: dateFilter.startDate
                    ? getPhilippinesTime(new Date(startDate), "start")
                    : undefined,
                lte: dateFilter.endDate
                    ? getPhilippinesTime(new Date(endDate), "end")
                    : undefined,
            },
            alliance_withdrawal_request_status: "APPROVED",
        },
        _count: true,
        _sum: {
            alliance_withdrawal_request_amount: true,
            alliance_withdrawal_request_fee: true,
        },
    });
    const returnData = {
        total_request: withdrawalData._count,
        total_amount: (withdrawalData._sum.alliance_withdrawal_request_amount || 0) -
            (withdrawalData._sum.alliance_withdrawal_request_fee || 0),
    };
    return returnData;
};
export const withdrawHideUserModel = async (params) => {
    const { id, type, teamMemberProfile } = params;
    if (type === "add") {
        await prisma.alliance_hidden_user_table.create({
            data: {
                alliance_hidden_user_member_id: id,
                alliance_hidden_user_action_by: teamMemberProfile.alliance_member_id,
            },
        });
    }
    else if (type === "remove") {
        await prisma.alliance_hidden_user_table.delete({
            where: {
                alliance_hidden_user_member_id: id,
            },
        });
    }
};
