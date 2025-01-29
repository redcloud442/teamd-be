import type { alliance_member_table, PrismaClient } from "@prisma/client";
import { sendErrorResponse } from "./function.js";

export const protectionMemberUser = async (
  userId: string,
  prisma: PrismaClient
) => {
  try {
    const [profile, teamMember] = await Promise.all([
      prisma.user_table.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          user_first_name: true,
          user_last_name: true,
          user_profile_picture: true,
          user_username: true,
        },
      }),
      prisma.alliance_member_table.findFirst({
        where: { alliance_member_user_id: userId },
        select: {
          alliance_member_id: true,
          alliance_member_is_active: true,
          alliance_member_role: true,
          alliance_member_alliance_id: true,
          alliance_member_restricted: true,
        },
      }),
    ]);

    if (!profile) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !teamMember?.alliance_member_alliance_id ||
      !["MEMBER", "MERCHANT", "ACCOUNTING", "ADMIN"].includes(
        teamMember.alliance_member_role
      )
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (teamMember.alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    const referal = await prisma.alliance_referral_link_table.findFirst({
      where: {
        alliance_referral_link_member_id: teamMember.alliance_member_id,
      },
      select: {
        alliance_referral_link: true,
      },
    });

    if (!referal) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    return {
      teamMemberProfile: teamMember as alliance_member_table,
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
    const [profile, teamMember] = await Promise.all([
      prisma.user_table.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          user_first_name: true,
          user_last_name: true,
          user_profile_picture: true,
          user_username: true,
        },
      }),
      prisma.alliance_member_table.findFirst({
        where: { alliance_member_user_id: userId },
        select: {
          alliance_member_id: true,
          alliance_member_is_active: true,
          alliance_member_role: true,
          alliance_member_alliance_id: true,
          alliance_member_restricted: true,
        },
      }),
    ]);

    if (!profile) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !teamMember?.alliance_member_alliance_id ||
      !["MERCHANT", "ADMIN"].includes(teamMember.alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (teamMember.alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    const referal = await prisma.alliance_referral_link_table.findFirst({
      where: {
        alliance_referral_link_member_id: teamMember.alliance_member_id,
      },
      select: {
        alliance_referral_link: true,
      },
    });

    if (!referal) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    return {
      teamMemberProfile: teamMember as alliance_member_table,
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
    const [profile, teamMember] = await Promise.all([
      prisma.user_table.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          user_first_name: true,
          user_last_name: true,
          user_profile_picture: true,
          user_username: true,
        },
      }),
      prisma.alliance_member_table.findFirst({
        where: { alliance_member_user_id: userId },
        select: {
          alliance_member_id: true,
          alliance_member_is_active: true,
          alliance_member_role: true,
          alliance_member_alliance_id: true,
          alliance_member_restricted: true,
        },
      }),
    ]);

    if (!profile) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !teamMember?.alliance_member_alliance_id ||
      !["ACCOUNTING", "ADMIN"].includes(teamMember.alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (teamMember.alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    const referal = await prisma.alliance_referral_link_table.findFirst({
      where: {
        alliance_referral_link_member_id: teamMember.alliance_member_id,
      },
      select: {
        alliance_referral_link: true,
      },
    });

    if (!referal) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    return {
      teamMemberProfile: teamMember as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAdmin = async (userId: string, prisma: PrismaClient) => {
  try {
    const [profile, teamMember] = await Promise.all([
      prisma.user_table.findUnique({
        where: { user_id: userId },
        select: {
          user_id: true,
          user_first_name: true,
          user_last_name: true,
          user_profile_picture: true,
          user_username: true,
        },
      }),
      prisma.alliance_member_table.findFirst({
        where: { alliance_member_user_id: userId },
        select: {
          alliance_member_id: true,
          alliance_member_is_active: true,
          alliance_member_role: true,
          alliance_member_alliance_id: true,
          alliance_member_restricted: true,
        },
      }),
    ]);

    if (!profile) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      !teamMember?.alliance_member_alliance_id ||
      !["ADMIN"].includes(teamMember.alliance_member_role)
    ) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    if (teamMember.alliance_member_restricted) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    const referal = await prisma.alliance_referral_link_table.findFirst({
      where: {
        alliance_referral_link_member_id: teamMember.alliance_member_id,
      },
      select: {
        alliance_referral_link: true,
      },
    });

    if (!referal) {
      return sendErrorResponse("Invalid Referral Link", 400);
    }

    return {
      teamMemberProfile: teamMember as alliance_member_table,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
