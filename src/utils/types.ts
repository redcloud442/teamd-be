import type {
  alliance_top_up_request_table,
  alliance_withdrawal_request_table,
  package_member_connection_table,
} from "@prisma/client";

export type UserRequestdata = {
  alliance_member_id: string;
  alliance_member_role: string;
  alliance_member_date_created: string;
  alliance_member_alliance_id: string;
  alliance_member_user_id: string;
  alliance_member_restricted: boolean;
  alliance_member_date_updated: string;
  alliance_member_is_active: boolean;
  user_id: string;
  user_username: string;
  user_first_name: string;
  user_last_name: string;
  user_date_created: string;
};

export type TopUpRequestData = alliance_top_up_request_table & {
  user_username: string;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  user_id: string;
  approver_username: string;
  alliance_member_id: string;
  count: number;
};

export type WithdrawalRequestData = alliance_withdrawal_request_table & {
  user_first_name: string;
  user_last_name: string;
  user_id: string;
  user_email: string;
  alliance_member_id: string;
  approver_username?: string;
};

export type ReturnDataType = {
  data: {
    [key: string]: {
      data: TopUpRequestData[];
      count: bigint;
    };
  };
  totalCount: bigint;
  merchantBalance?: number;
};

export type WithdrawReturnDataType = {
  totalWithdrawals?: {
    amount: number;
  };
  data: {
    [key: string]: {
      data: WithdrawalRequestData[];
      count: bigint;
    };
  };
  totalCount: bigint;
};

export type PackageMemberWithPackage = package_member_connection_table & {
  package_table: {
    package_name: string;
    package_color: string | null;
    packages_days: number | null;
  };
};
