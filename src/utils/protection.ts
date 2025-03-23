import type { alliance_member_table, PrismaClient } from "@prisma/client";
import { sendErrorResponse } from "./function.js";

export const protectionMemberUser = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      include: {
        alliance_member_table: true,
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !user?.alliance_member_table?.[0]?.alliance_member_alliance_id ||
      ![
        "MEMBER",
        "MERCHANT",
        "ACCOUNTING",
        "ADMIN",
        "ACCOUNTING_HEAD",
      ].includes(user.alliance_member_table[0].alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionMerchantAdmin = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      include: {
        alliance_member_table: true,
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !user?.alliance_member_table?.[0]?.alliance_member_alliance_id ||
      !["MERCHANT", "ADMIN"].includes(
        user?.alliance_member_table?.[0]?.alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAccountingAdmin = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      include: {
        alliance_member_table: true,
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !user?.alliance_member_table?.[0]?.alliance_member_alliance_id ||
      !["ACCOUNTING", "ADMIN", "ACCOUNTING_HEAD"].includes(
        user?.alliance_member_table?.[0]?.alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    const referal = await prisma.alliance_referral_link_table.findFirst({
      where: {
        alliance_referral_link_member_id:
          user?.alliance_member_table?.[0]?.alliance_member_id,
      },
      select: {
        alliance_referral_link: true,
      },
    });

    if (!referal) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAdmin = async (userId: string, prisma: PrismaClient) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      include: {
        alliance_member_table: true,
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !user?.alliance_member_table?.[0]?.alliance_member_alliance_id ||
      !["ADMIN"].includes(
        user?.alliance_member_table?.[0]?.alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    const referal = await prisma.alliance_referral_link_table.findFirst({
      where: {
        alliance_referral_link_member_id:
          user?.alliance_member_table?.[0]?.alliance_member_id,
      },
      select: {
        alliance_referral_link: true,
      },
    });

    if (!referal) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionMerchantAdminAccounting = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const user = await prisma.user_table.findUnique({
      where: { user_id: userId },
      include: {
        alliance_member_table: true,
      },
    });

    if (!user) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !user?.alliance_member_table?.[0]?.alliance_member_alliance_id ||
      !["MERCHANT", "ACCOUNTING", "ADMIN"].includes(
        user.alliance_member_table[0].alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (user.alliance_member_table[0].alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    return {
      teamMemberProfile: user.alliance_member_table[0] as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
