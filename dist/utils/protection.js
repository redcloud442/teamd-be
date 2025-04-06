import { sendErrorResponse } from "./function.js";
export const protectionMemberUser = async (userId, prisma) => {
    try {
        const user = await prisma.user_table.findUnique({
            where: { user_id: userId },
            select: {
                company_member_table: {
                    select: {
                        company_member_id: true,
                        company_member_role: true,
                        company_member_company_id: true,
                        company_member_restricted: true,
                    },
                },
            },
        });
        if (!user) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        if (!user?.company_member_table?.[0]?.company_member_company_id ||
            ![
                "MEMBER",
                "MERCHANT",
                "ACCOUNTING",
                "ADMIN",
                "ACCOUNTING_HEAD",
            ].includes(user.company_member_table[0].company_member_role)) {
            return sendErrorResponse("Unauthorized", 401);
        }
        if (user.company_member_table[0].company_member_restricted) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        return {
            teamMemberProfile: user.company_member_table[0],
        };
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const protectionMerchantAdmin = async (userId, prisma) => {
    try {
        const user = await prisma.user_table.findUnique({
            where: { user_id: userId },
            select: {
                company_member_table: {
                    select: {
                        company_member_id: true,
                        company_member_role: true,
                        company_member_company_id: true,
                        company_member_restricted: true,
                    },
                },
            },
        });
        if (!user) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        if (!user?.company_member_table?.[0]?.company_member_company_id ||
            !["MERCHANT", "ADMIN"].includes(user?.company_member_table?.[0]?.company_member_role)) {
            return sendErrorResponse("Unauthorized", 401);
        }
        if (user.company_member_table[0].company_member_restricted) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        return {
            teamMemberProfile: user.company_member_table[0],
        };
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const protectionAccountingAdmin = async (userId, prisma) => {
    try {
        const user = await prisma.user_table.findUnique({
            where: { user_id: userId },
            include: {
                company_member_table: true,
            },
        });
        if (!user) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        if (!user?.company_member_table?.[0]?.company_member_company_id ||
            !["ACCOUNTING", "ADMIN", "ACCOUNTING_HEAD"].includes(user?.company_member_table?.[0]?.company_member_role)) {
            return sendErrorResponse("Unauthorized", 401);
        }
        if (user.company_member_table[0].company_member_restricted) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        return {
            teamMemberProfile: user.company_member_table[0],
        };
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const protectionAdmin = async (userId, prisma) => {
    try {
        const user = await prisma.user_table.findUnique({
            where: { user_id: userId },
            include: {
                company_member_table: true,
            },
        });
        if (!user) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        if (!user?.company_member_table?.[0]?.company_member_company_id ||
            !["ADMIN"].includes(user?.company_member_table?.[0]?.company_member_role)) {
            return sendErrorResponse("Unauthorized", 401);
        }
        if (user.company_member_table[0].company_member_restricted) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        return {
            teamMemberProfile: user.company_member_table[0],
        };
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const protectionMerchantAdminAccounting = async (userId, prisma) => {
    try {
        const user = await prisma.user_table.findUnique({
            where: { user_id: userId },
            include: {
                company_member_table: true,
            },
        });
        if (!user) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        if (!user?.company_member_table?.[0]?.company_member_company_id ||
            !["MERCHANT", "ACCOUNTING", "ADMIN"].includes(user.company_member_table[0].company_member_role)) {
            return sendErrorResponse("Unauthorized", 401);
        }
        if (user.company_member_table[0].company_member_restricted) {
            return sendErrorResponse("Internal Server Error", 500);
        }
        return {
            teamMemberProfile: user.company_member_table[0],
        };
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
