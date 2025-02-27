import { redis } from "@/utils/redis.js";
import type { alliance_member_table } from "@prisma/client";
import prisma from "../../utils/prisma.js";

export const transactionModelGet = async (params: {
  teamMemberProfile: alliance_member_table;
  limit: number;
  page: number;
}) => {
  const { teamMemberProfile, limit, page } = params;

  const cacheKey = `transaction-${teamMemberProfile.alliance_member_id}-${limit}-${page}`;

  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
  const safePage = Math.max(Number(page), 1);

  const totalTransactions = await prisma.alliance_transaction_table.count({
    where: {
      alliance_member_table: {
        alliance_member_id: teamMemberProfile.alliance_member_id,
      },
    },
  });

  const offset = (safePage - 1) * safeLimit;

  const transactionHistory = await prisma.alliance_transaction_table.findMany({
    where: {
      alliance_member_table: {
        alliance_member_id: teamMemberProfile.alliance_member_id,
      },
    },
    select: {
      transaction_description: true,
      transaction_amount: true,
      transaction_date: true,
      transaction_details: true,
      transaction_attachment: true,
    },
    skip: offset,
    take: safeLimit,
    orderBy: {
      transaction_date: "desc",
    },
  });

  await redis.set(
    cacheKey,
    JSON.stringify({ totalTransactions, transactionHistory }),
    {
      ex: 60 * 60 * 24 * 30,
    }
  );

  return {
    totalTransactions,
    transactionHistory,
  };
};
