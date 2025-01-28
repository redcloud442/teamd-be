import type { Role } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { supabaseClient } from "../../utils/supabase.js";

export const userModelPut = async (params: {
  userId: string;
  email: string;
  password: string;
}) => {
  const { userId, email, password } = params;

  const user = await prisma.user_table.findFirst({
    where: {
      user_email: {
        equals: email,
        mode: "insensitive",
      },
    },
  });

  if (!user) {
    return { success: false, error: "User not found." };
  }

  const userCompare = await bcryptjs.compare(password, user?.user_password);

  if (!userCompare) {
    return { success: false, error: "Invalid request." };
  }

  const teamMemberProfile = await prisma.alliance_member_table.findFirst({
    where: { alliance_member_user_id: user?.user_id },
  });

  if (!teamMemberProfile) {
    return { success: false, error: "Invalid request." };
  }

  if (
    teamMemberProfile.alliance_member_restricted ||
    !teamMemberProfile.alliance_member_alliance_id
  ) {
    return { success: false, error: "Access restricted" };
  }

  prisma.user_table.update({
    where: {
      user_id: userId,
    },
    data: {
      user_password: password,
    },
  });

  if (teamMemberProfile?.alliance_member_role !== "ADMIN") {
    const supabase = supabaseClient;
    const { error } = await supabase.auth.updateUser({
      email: email,
      password: password,
    });
    if (error) {
      return { success: false, error: "Failed to update user password" };
    }
  } else {
    const supabase = supabaseClient;
    await supabase.auth.admin.updateUserById(userId, {
      password: password,
    });
  }

  return { success: true, message: "Password updated successfully" };
};

export const userModelPost = async (params: { memberId: string }) => {
  const { memberId } = params;

  const user = await prisma.dashboard_earnings_summary.findUnique({
    where: {
      member_id: memberId,
    },
    select: {
      direct_referral_amount: true,
      indirect_referral_amount: true,
      total_earnings: true,
      total_withdrawals: true,
      direct_referral_count: true,
      indirect_referral_count: true,
    },
  });

  const userEarnings = await prisma.alliance_earnings_table.findUnique({
    where: {
      alliance_earnings_member_id: memberId,
    },
    select: {
      alliance_olympus_wallet: true,
      alliance_olympus_earnings: true,
      alliance_combined_earnings: true,
      alliance_referral_bounty: true,
    },
  });

  const totalEarnings = {
    directReferralAmount: user?.direct_referral_amount,
    indirectReferralAmount: user?.indirect_referral_amount,
    totalEarnings: user?.total_earnings,
    withdrawalAmount: user?.total_withdrawals,
    directReferralCount: user?.direct_referral_count,
    indirectReferralCount: user?.indirect_referral_count,
  };

  return { totalEarnings, userEarningsData: userEarnings };
};

export const userModelGet = async (params: { memberId: string }) => {
  const { memberId } = params;

  let isWithdrawalToday = false;
  const today = new Date().toISOString().split("T")[0];
  const existingWithdrawal =
    await prisma.alliance_withdrawal_request_table.findFirst({
      where: {
        alliance_withdrawal_request_member_id: memberId,
        alliance_withdrawal_request_status: "APPROVED",
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
    isWithdrawalToday = true;
  }

  return { isWithdrawalToday };
};

export const userPatchModel = async (params: {
  memberId: string;
  action: string;
  role: Role;
}) => {
  const { memberId, action, role } = params;

  if (action === "updateRole") {
    await prisma.alliance_member_table.update({
      where: { alliance_member_id: memberId },
      data: {
        alliance_member_role: role,
        alliance_member_is_active:
          role &&
          ["ADMIN", "MERCHANT", "ACCOUNTING"].some((r) => role.includes(r))
            ? true
            : undefined, // Stay as is if no role is included
      },
    });

    if (role === "MERCHANT") {
      await prisma.merchant_member_table.create({
        data: {
          merchant_member_merchant_id: memberId,
        },
      });
    }

    return {
      success: true,
      message: "User role updated successfully.",
    };
  }

  if (action === "banUser") {
    await prisma.alliance_member_table.update({
      where: { alliance_member_id: memberId },
      data: { alliance_member_restricted: true },
    });

    return {
      success: true,
      message: "User banned successfully.",
    };
  }
};

export const userSponsorModel = async (params: { userId: string }) => {
  const { userId } = params;

  const supabase = supabaseClient;

  const { data: userData, error } = await supabase.rpc("get_user_sponsor", {
    input_data: { userId },
  });

  if (error) {
    return sendErrorResponse("Failed to get user sponsor", 500);
  }

  const { data } = userData;

  return data;
};

export const userProfileModelPut = async (params: {
  profilePicture: string;
  userId: string;
}) => {
  const { profilePicture, userId } = params;
  await prisma.$transaction(async (tx) => {
    await tx.user_table.update({
      where: { user_id: userId },
      data: { user_profile_picture: profilePicture },
    });
  });
};

export const userGenerateLinkModel = async (params: {
  formattedUserName: string;
}) => {
  const { formattedUserName } = params;

  const { data, error } = await supabaseClient.auth.admin.generateLink({
    type: "magiclink",
    email: formattedUserName,
  });

  if (error) throw error;

  return data.properties;
};
