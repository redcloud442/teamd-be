import type { User } from "@supabase/supabase-js";
import { sendErrorResponse } from "./function.js";

export const protectionMemberUser = async (user: User) => {
  try {
    const userData = user.user_metadata;

    if (!userData) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (
      ![
        "MEMBER",
        "MERCHANT",
        "ACCOUNTING",
        "ADMIN",
        "ACCOUNTING_HEAD",
      ].includes(userData.Role)
    ) {
      return sendErrorResponse("Unauthorized", 401);
    }

    const teamMemberProfile = {
      company_member_id: userData.CompanyMemberId,
      company_member_role: userData.Role,
      company_member_company_id: userData.CompanyId,
      company_user_id: userData.UserId,
    };

    return {
      teamMemberProfile: teamMemberProfile,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionMerchantAdmin = async (user: User) => {
  try {
    const userData = user.user_metadata;

    if (!userData) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (!["MERCHANT", "ADMIN"].includes(userData.Role)) {
      return sendErrorResponse("Unauthorized", 401);
    }

    const teamMemberProfile = {
      company_member_id: userData.CompanyMemberId,
      company_member_role: userData.Role,
      company_member_company_id: userData.CompanyId,
      company_user_id: userData.UserId,
    };

    return {
      teamMemberProfile: teamMemberProfile,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAccountingAdmin = async (user: User) => {
  try {
    const userData = user.user_metadata;

    if (!userData) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (!["ACCOUNTING", "ADMIN", "ACCOUNTING_HEAD"].includes(userData.Role)) {
      return sendErrorResponse("Unauthorized", 401);
    }

    const teamMemberProfile = {
      company_member_id: userData.CompanyMemberId,
      company_member_role: userData.Role,
      company_member_company_id: userData.CompanyId,
      company_user_id: userData.UserId,
    };

    return {
      teamMemberProfile: teamMemberProfile,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionAdmin = async (user: User) => {
  try {
    const userData = user.user_metadata;

    if (!userData) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (!userData.CompanyId || !["ADMIN"].includes(userData.Role)) {
      return sendErrorResponse("Unauthorized", 401);
    }

    const teamMemberProfile = {
      company_member_id: userData.CompanyMemberId,
      company_member_role: userData.Role,
      company_member_company_id: userData.CompanyId,
      company_user_id: userData.UserId,
    };

    return {
      teamMemberProfile: teamMemberProfile,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const protectionMerchantAdminAccounting = async (user: User) => {
  try {
    const userData = user.user_metadata;

    if (!userData) {
      return sendErrorResponse("Internal Server Error", 500);
    }

    if (!["MERCHANT", "ACCOUNTING", "ADMIN"].includes(userData.Role)) {
      return sendErrorResponse("Unauthorized", 401);
    }

    const teamMemberProfile = {
      company_member_id: userData.CompanyMemberId,
      company_member_role: userData.Role,
      company_member_company_id: userData.CompanyId,
      company_user_id: userData.UserId,
    };

    return {
      teamMemberProfile: teamMemberProfile,
    };
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
