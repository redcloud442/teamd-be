import { Prisma, type alliance_member_table } from "@prisma/client";
import { type DepositFormValues } from "../../schema/schema.js";
import prisma from "../../utils/prisma.js";
import { supabaseClient } from "../../utils/supabase.js";
export const depositPostModel = async (params: {
  TopUpFormValues: DepositFormValues;
  publicUrl: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const { amount, accountName, accountNumber } = params.TopUpFormValues;

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
        alliance_top_up_request_member_id:
          params.teamMemberProfile.alliance_member_id,
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

export const depositPutModel = async (params: {
  status: string;
  note: string;
  requestId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const { status, note, requestId, teamMemberProfile } = params;

  const merchant = await prisma.merchant_member_table.findFirst({
    where: {
      merchant_member_merchant_id: teamMemberProfile.alliance_member_id,
    },
  });

  if (!merchant && teamMemberProfile.alliance_member_role === "MERCHANT")
    throw new Error("Merchant not found.");

  await prisma.$transaction(async (tx) => {
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
        alliance_top_up_request_approved_by:
          teamMemberProfile.alliance_member_id,
        alliance_top_up_request_reject_note: note ?? null,
      },
    });

    await tx.alliance_transaction_table.create({
      data: {
        transaction_description: `Deposit ${
          status.slice(0, 1).toUpperCase() + status.slice(1).toLowerCase()
        } ${note ? `(${note})` : ""}`,
        transaction_details: `Account Name: ${updatedRequest.alliance_top_up_request_name} | Account Number: ${updatedRequest.alliance_top_up_request_account}`,
        transaction_amount: updatedRequest.alliance_top_up_request_amount,
        transaction_member_id: updatedRequest.alliance_top_up_request_member_id,
      },
    });

    if (status === "APPROVED") {
      const updatedEarnings = await tx.alliance_earnings_table.upsert({
        where: {
          alliance_earnings_member_id:
            updatedRequest.alliance_top_up_request_member_id,
        },
        create: {
          alliance_earnings_member_id:
            updatedRequest.alliance_top_up_request_member_id,
          alliance_olympus_wallet:
            updatedRequest.alliance_top_up_request_amount,
          alliance_combined_earnings:
            updatedRequest.alliance_top_up_request_amount,
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

      if (merchant) {
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

      return { updatedRequest, updatedEarnings };
    }
  });
};

export const depositHistoryPostModel = async (params: {
  search: string;
  page: string;
  limit: string;
  sortBy: string;
  columnAccessor: string;
  isAscendingSort: string;
  teamMemberId: string;
  userId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const {
    search,
    page,
    sortBy,
    limit,
    columnAccessor,
    isAscendingSort,

    userId,
    teamMemberProfile,
  } = params;

  const input_data = {
    search,
    page,
    limit,
    sortBy,
    columnAccessor,
    isAscendingSort: isAscendingSort,
    teamId: teamMemberProfile?.alliance_member_alliance_id || "",
    userId: userId ? userId : teamMemberProfile?.alliance_member_id,
  };

  const { data, error } = await supabaseClient.rpc(
    "get_member_top_up_history",
    {
      input_data: input_data,
    }
  );

  if (error) throw error;

  return data;
};

export const depositListPostModel = async (
  params: {
    page: number;
    limit: number;
    search: string;
    isAscendingSort: boolean;
    columnAccessor: string;
    merchantFilter: string;
    userFilter: string;
    statusFilter: string;
    dateFilter: {
      start: string;
      end: string;
    };
  },
  teamMemberProfile: alliance_member_table
) => {
  const {
    page,
    limit,
    search,
    isAscendingSort,
    columnAccessor,
    merchantFilter,
    userFilter,
    statusFilter,
    dateFilter,
  } = params;

  let returnData = {
    data: {
      APPROVED: { data: [], count: BigInt(0) },
      REJECTED: { data: [], count: BigInt(0) },
      PENDING: { data: [], count: BigInt(0) },
    },
    totalCount: BigInt(0),
  };

  // SQL Query Conditions
  const offset = (page - 1) * limit;
  const sortBy = isAscendingSort ? "ASC" : "DESC";
  const orderBy = columnAccessor
    ? Prisma.sql`ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
    : Prisma.empty;

  const conditions: Prisma.Sql[] = [
    Prisma.sql`m.alliance_member_alliance_id = ${teamMemberProfile.alliance_member_alliance_id}::uuid`,
  ];

  if (merchantFilter) {
    conditions.push(Prisma.sql`approver.user_id::TEXT = ${merchantFilter}`);
  }

  if (userFilter) {
    conditions.push(Prisma.sql`u.user_id::TEXT = ${userFilter}`);
  }

  if (statusFilter) {
    conditions.push(
      Prisma.sql`t.alliance_top_up_request_status = ${statusFilter}`
    );
  }

  if (dateFilter?.start && dateFilter?.end) {
    conditions.push(
      Prisma.sql`t.alliance_top_up_request_date BETWEEN ${dateFilter.start} AND ${dateFilter.end}`
    );
  }

  if (search) {
    conditions.push(
      Prisma.sql`(
          u.user_username ILIKE ${`%${search}%`}
          OR u.user_id::TEXT ILIKE ${`%${search}%`}
          OR u.user_first_name ILIKE ${`%${search}%`}
          OR u.user_last_name ILIKE ${`%${search}%`}
        )`
    );
  }

  const whereClause =
    conditions.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
      : Prisma.empty;

  // Construct WHERE clause
  // Fetch paginated top-up requests
  const topUpRequests = await prisma.$queryRaw(
    Prisma.sql`
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
      ${whereClause}
      ${orderBy}
      LIMIT ${Prisma.raw(limit.toString())}
      OFFSET ${Prisma.raw(offset.toString())}
    `
  );
  console.log("Top-Up Requests:", topUpRequests);

  // Fetch status counts
  const statusCounts = await prisma.$queryRaw<
    { status: string; count: bigint }[]
  >(
    Prisma.sql`
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
      ${whereClause}
      GROUP BY t.alliance_top_up_request_status
    `
  );

  console.log("Status Counts:", statusCounts);

  // Initialize counts for all statuses
  ["APPROVED", "REJECTED", "PENDING"].forEach((status) => {
    const match = statusCounts.find((item) => item.status === status);
    returnData.data[status as keyof typeof returnData.data].count = match
      ? BigInt(match.count)
      : BigInt(0);
  });

  // Group requests by status
  (topUpRequests as any[]).forEach((request) => {
    const status = request.alliance_top_up_request_status;
    if (returnData.data[status as keyof typeof returnData.data]) {
      returnData.data[status as keyof typeof returnData.data].data.push(
        request as any
      );
    }
  });

  // Calculate total count
  returnData.totalCount = statusCounts.reduce(
    (sum, item) => sum + BigInt(item.count),
    BigInt(0)
  );

  // Convert BigInt to string for JSON serialization
  return JSON.parse(
    JSON.stringify(returnData, (key, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
};
