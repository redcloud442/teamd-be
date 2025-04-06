import prisma from "../../utils/prisma.js";
export const transactionModelGet = async (params) => {
    const { teamMemberProfile, limit, page } = params;
    const safeLimit = Math.min(Math.max(Number(limit), 1), 100);
    const safePage = Math.max(Number(page), 1);
    const totalTransactions = await prisma.company_transaction_table.count({
        where: {
            company_member_table: {
                company_member_id: teamMemberProfile.company_member_id,
            },
        },
    });
    const offset = (safePage - 1) * safeLimit;
    const transactionHistory = await prisma.company_transaction_table.findMany({
        where: {
            company_member_table: {
                company_member_id: teamMemberProfile.company_member_id,
            },
        },
        select: {
            company_transaction_description: true,
            company_transaction_amount: true,
            company_transaction_date: true,
            company_transaction_details: true,
            company_transaction_attachment: true,
        },
        skip: offset,
        take: safeLimit,
        orderBy: {
            company_transaction_date: "desc",
        },
    });
    return {
        totalTransactions,
        transactionHistory,
    };
};
