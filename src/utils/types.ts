import type {
  company_deposit_request_table,
  company_withdrawal_request_table,
  package_member_connection_table,
} from "@prisma/client";

export type UserRequestdata = {
  company_member_id: string;
  company_member_role: string;
  company_member_date_created: string;
  company_member_company_id: string;
  company_member_user_id: string;
  company_member_restricted: boolean;
  company_member_date_updated: string;
  company_member_is_active: boolean;
  user_id: string;
  user_username: string;
  user_first_name: string;
  user_last_name: string;
  user_date_created: string;
};

export type TopUpRequestData = company_deposit_request_table & {
  user_username: string;
  user_first_name: string;
  user_last_name: string;
  user_email: string;
  user_id: string;
  approver_username: string;
  company_member_id: string;
  count: number;
};

export type WithdrawalRequestData = company_withdrawal_request_table & {
  user_first_name: string;
  user_last_name: string;
  user_id: string;
  user_email: string;
  company_member_id: string;
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
    approvedAmount: number;
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
