import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
export const transactionModelGet = async (params) => {
    const { teamMemberProfile, limit, page, status } = params;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const safePage = Math.max(Number(page), 1);
    let returnData = {
        totalTransactions: 0,
        transactionHistory: [],
    };
    const version = (await redis.get(`transaction:${teamMemberProfile.company_member_id}:${status}:version`)) || "v1";
    const cacheKey = `transaction:${teamMemberProfile.company_member_id}:${status}:${page}:${limit}:${version}`;
    const offset = (safePage - 1) * safeLimit;
    const cached = await redis.get(cacheKey);
    if (cached) {
        return cached;
    }
    if (status !== "REFERRAL") {
        returnData.totalTransactions = await prisma.company_transaction_table.count({
            where: {
                company_member_table: {
                    company_member_id: teamMemberProfile.company_member_id,
                },
                company_transaction_type: status,
            },
        });
        returnData.transactionHistory =
            await prisma.company_transaction_table.findMany({
                where: {
                    company_member_table: {
                        company_member_id: teamMemberProfile.company_member_id,
                    },
                    company_transaction_type: status,
                },
                skip: offset,
                take: safeLimit,
                orderBy: {
                    company_transaction_date: "desc",
                },
            });
    }
    else {
        returnData.totalTransactions = await prisma.package_ally_bounty_log.count({
            where: {
                package_ally_bounty_member_id: teamMemberProfile.company_member_id,
            },
        });
        const packageReferral = await prisma.package_ally_bounty_log.findMany({
            where: {
                package_ally_bounty_member_id: teamMemberProfile.company_member_id,
            },
            select: {
                package_ally_bounty_log_id: true,
                package_ally_bounty_log_date_created: true,
                package_ally_bounty_type: true,
                package_ally_bounty_connection_id: true,
                package_ally_bounty_earnings: true,
                company_member_table_from: {
                    select: {
                        user_table: {
                            select: {
                                user_username: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                package_ally_bounty_log_date_created: "desc",
            },
            skip: offset,
            take: safeLimit,
        });
        returnData.transactionHistory = packageReferral.map((ref) => ({
            company_transaction_id: ref.package_ally_bounty_log_id,
            company_transaction_date: ref.package_ally_bounty_log_date_created,
            company_transaction_description: ref.package_ally_bounty_type === "DIRECT" ? "Direct" : `Unilevel`,
            company_transaction_type: "EARNINGS",
            company_transaction_details: ref.company_member_table_from?.user_table.user_username ?? null,
            company_transaction_amount: ref.package_ally_bounty_earnings ?? null,
            company_transaction_member_id: ref.package_ally_bounty_connection_id,
            company_transaction_attachment: null,
            company_transaction_note: null,
        }));
    }
    const result = {
        totalTransactions: returnData.totalTransactions,
        transactionHistory: returnData.transactionHistory,
    };
    await redis.set(cacheKey, JSON.stringify(result), { ex: 600 });
    return result;
};
