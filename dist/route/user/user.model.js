import { Prisma, } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
import { supabaseClient } from "../../utils/supabase.js";
export const userModelPut = async (params) => {
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
    const teamMemberProfile = await prisma.company_member_table.findFirst({
        where: { company_member_user_id: user?.user_id },
    });
    if (!teamMemberProfile) {
        return { success: false, error: "Invalid request." };
    }
    if (teamMemberProfile.company_member_restricted ||
        !teamMemberProfile.company_member_company_id) {
        return { success: false, error: "Access restricted" };
    }
    if (teamMemberProfile?.company_member_role !== "ADMIN") {
        const supabase = supabaseClient;
        const { error } = await supabase.auth.updateUser({
            email: email,
            password: password,
        });
        if (error) {
            return { success: false, error: "Failed to update user password" };
        }
    }
    else {
        const supabase = supabaseClient;
        await supabase.auth.admin.updateUserById(userId, {
            password: password,
        });
    }
    return { success: true, message: "Password updated successfully" };
};
export const userModelGetById = async (params) => {
    const { id } = params;
    const userData = await prisma.user_table.findUnique({
        where: { user_id: id },
        include: {
            company_member_table: {
                include: {
                    dashboard_earnings_summary: true,
                    merchant_member_table: true,
                },
            },
        },
    });
    if (!userData) {
        return { success: false, error: "User not found" };
    }
    const earningsData = userData.company_member_table[0]?.dashboard_earnings_summary[0];
    const allianceData = userData.company_member_table[0];
    const merchantData = userData.company_member_table[0]?.merchant_member_table[0];
    const combinedData = {
        ...userData,
        ...allianceData,
        ...merchantData,
        ...earningsData,
    };
    return { success: true, data: combinedData };
};
export const userModelGetByUserIdData = async (params) => {
    const { id } = params;
    const cacheKey = `user-${id}`;
    // const cachedData = await redis.get(cacheKey);
    // if (cachedData) {
    //   return cachedData;
    // }
    const user = await prisma.user_table.findUnique({
        where: {
            user_id: id,
        },
        select: {
            user_id: true,
            user_username: true,
            user_first_name: true,
            user_last_name: true,
            user_email: true,
            user_phone_number: true,
            user_profile_picture: true,
            company_member_table: {
                select: {
                    company_member_id: true,
                    company_member_role: true,
                    company_member_is_active: true,
                    company_member_date_created: true,
                    company_member_date_updated: true,
                    company_referral_link_table: {
                        select: {
                            company_referral_link_id: true,
                            company_referral_code: true,
                            company_referral_link: true,
                        },
                    },
                },
            },
        },
    });
    console.log(user);
    // await redis.set(cacheKey, JSON.stringify(user), {
    //   ex: 60 * 5,
    // });
    return user;
};
export const userModelPost = async (params) => {
    const { memberId } = params;
    const user = await prisma.user_table.findUnique({
        where: {
            user_id: memberId,
        },
        select: {
            user_id: true,
            user_username: true,
            user_first_name: true,
            user_last_name: true,
            user_email: true,
            user_phone_number: true,
            user_profile_picture: true,
            company_member_table: {
                select: {
                    company_member_id: true,
                    company_member_role: true,
                    company_member_is_active: true,
                    company_member_date_created: true,
                    company_member_date_updated: true,
                    dashboard_earnings_summary: {
                        select: {
                            direct_referral_amount: true,
                            indirect_referral_amount: true,
                            total_earnings: true,
                            total_withdrawals: true,
                            direct_referral_count: true,
                            indirect_referral_count: true,
                            package_income: true,
                        },
                    },
                    company_earnings_table: {
                        select: {
                            company_earnings_member_id: true,
                            company_combined_earnings: true,
                            company_package_earnings: true,
                            company_referral_earnings: true,
                            company_member_wallet: true,
                        },
                    },
                },
            },
        },
    });
    const member = user?.company_member_table[0];
    const totalEarnings = {
        directReferralAmount: member?.dashboard_earnings_summary[0]?.direct_referral_amount ?? 0,
        indirectReferralAmount: member?.dashboard_earnings_summary[0]?.indirect_referral_amount ?? 0,
        totalEarnings: member?.dashboard_earnings_summary[0]?.total_earnings ?? 0,
        withdrawalAmount: member?.dashboard_earnings_summary[0]?.total_withdrawals ?? 0,
        packageEarnings: member?.company_earnings_table[0]?.company_package_earnings ?? 0,
        directReferralCount: member?.dashboard_earnings_summary[0]?.direct_referral_count ?? 0,
        indirectReferralCount: member?.dashboard_earnings_summary[0]?.indirect_referral_count ?? 0,
    };
    return {
        totalEarnings,
        userEarningsData: member?.company_earnings_table[0],
        teamMemberProfile: user?.company_member_table,
        userProfile: {
            user_id: user?.user_id,
            user_username: user?.user_username,
            user_first_name: user?.user_first_name,
            user_last_name: user?.user_last_name,
            user_email: user?.user_email,
            user_phone_number: user?.user_phone_number,
            user_profile_picture: user?.user_profile_picture,
        },
    };
};
export const userModelGet = async ({ memberId }) => {
    const cacheKey = `user-model-get-${memberId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const todayStart = getPhilippinesTime(new Date(), "start");
    const todayEnd = getPhilippinesTime(new Date(), "end");
    const baseWithdrawFilter = {
        company_withdrawal_request_member_id: memberId,
        company_withdrawal_request_status: {
            in: ["PENDING", "APPROVED"],
        },
        company_withdrawal_request_date: {
            gte: todayStart,
            lte: todayEnd,
        },
    };
    const [existingPackageWithdrawal, existingReferralWithdrawal, existingDeposit, user,] = await Promise.all([
        prisma.company_withdrawal_request_table.findFirst({
            where: {
                ...baseWithdrawFilter,
                company_withdrawal_request_withdraw_type: "PACKAGE",
            },
            select: {
                company_withdrawal_request_id: true,
            },
        }),
        prisma.company_withdrawal_request_table.findFirst({
            where: {
                ...baseWithdrawFilter,
                company_withdrawal_request_withdraw_type: "REFERRAL",
            },
            select: {
                company_withdrawal_request_id: true,
            },
        }),
        prisma.company_deposit_request_table.findFirst({
            where: {
                company_deposit_request_member_id: memberId,
                company_deposit_request_status: "PENDING",
            },
            select: {
                company_deposit_request_id: true,
            },
            take: 1,
            orderBy: {
                company_deposit_request_date: "desc",
            },
        }),
        prisma.user_table.findFirst({
            where: {
                company_member_table: {
                    some: {
                        company_member_id: memberId,
                    },
                },
            },
            select: {
                user_id: true,
                user_username: true,
                user_first_name: true,
                user_last_name: true,
                user_email: true,
                user_phone_number: true,
                user_profile_picture: true,
                company_member_table: {
                    select: {
                        company_member_id: true,
                        company_member_role: true,
                        company_member_is_active: true,
                        company_member_date_created: true,
                        company_member_date_updated: true,
                        dashboard_earnings_summary: {
                            select: {
                                direct_referral_amount: true,
                                indirect_referral_amount: true,
                                total_earnings: true,
                                total_withdrawals: true,
                                direct_referral_count: true,
                                indirect_referral_count: true,
                                package_income: true,
                            },
                        },
                        company_earnings_table: {
                            select: {
                                company_earnings_member_id: true,
                                company_combined_earnings: true,
                                company_package_earnings: true,
                                company_referral_earnings: true,
                                company_member_wallet: true,
                            },
                        },
                    },
                },
            },
        }),
    ]);
    const member = user?.company_member_table[0];
    const totalEarnings = {
        directReferralAmount: member?.dashboard_earnings_summary[0]?.direct_referral_amount ?? 0,
        indirectReferralAmount: member?.dashboard_earnings_summary[0]?.indirect_referral_amount ?? 0,
        totalEarnings: member?.dashboard_earnings_summary[0]?.total_earnings ?? 0,
        withdrawalAmount: member?.dashboard_earnings_summary[0]?.total_withdrawals ?? 0,
        packageEarnings: member?.company_earnings_table[0]?.company_package_earnings ?? 0,
        directReferralCount: member?.dashboard_earnings_summary[0]?.direct_referral_count ?? 0,
        indirectReferralCount: member?.dashboard_earnings_summary[0]?.indirect_referral_count ?? 0,
    };
    const actions = {
        canWithdrawPackage: existingPackageWithdrawal === null,
        canWithdrawReferral: existingReferralWithdrawal === null,
        canUserDeposit: existingDeposit === null,
    };
    const returnData = {
        totalEarnings,
        userEarningsData: member?.company_earnings_table[0],
        teamMemberProfile: user?.company_member_table[0],
        userProfile: {
            user_id: user?.user_id,
            user_username: user?.user_username,
            user_first_name: user?.user_first_name,
            user_last_name: user?.user_last_name,
            user_email: user?.user_email,
            user_phone_number: user?.user_phone_number,
            user_profile_picture: user?.user_profile_picture,
        },
        actions,
    };
    await redis.set(cacheKey, JSON.stringify(returnData), {
        ex: 600,
    });
    return returnData;
};
export const userPatchModel = async (params) => {
    const { memberId, action, role, type } = params;
    let userId;
    if (action === "updateRole") {
        userId = await prisma.company_member_table.findFirst({
            where: { company_member_id: memberId },
            select: {
                company_member_user_id: true,
            },
        });
        if (!userId) {
            return {
                success: false,
                error: "User not found.",
            };
        }
        await prisma.company_member_table.update({
            where: { company_member_id: memberId },
            data: {
                company_member_role: role,
                company_member_date_updated: new Date(),
                company_member_is_active: role &&
                    ["ADMIN", "MERCHANT", "ACCOUNTING"].some((r) => role.includes(r))
                    ? true
                    : undefined, // Stay as is if no role is included
            },
        });
        if (role === "ADMIN" || role === "ACCOUNTING" || role === "MERCHANT") {
            await prisma.company_earnings_table.upsert({
                where: {
                    company_earnings_member_id: memberId,
                },
                update: {},
                create: {
                    company_earnings_member_id: memberId,
                },
            });
        }
        if (role === "MERCHANT") {
            await prisma.merchant_member_table.create({
                data: {
                    merchant_member_merchant_id: memberId,
                },
            });
        }
        await supabaseClient.auth.admin.updateUserById(userId.company_member_user_id, {
            user_metadata: {
                Role: role,
            },
        });
        await prisma.$executeRaw `
    DELETE FROM auth.sessions
    WHERE user_id = ${userId.company_member_user_id}::uuid
    `;
        return {
            success: true,
            message: "User role updated successfully.",
        };
    }
    if (action === "banUser") {
        userId = await prisma.company_member_table.findFirst({
            where: { company_member_id: memberId },
            select: {
                company_member_user_id: true,
            },
        });
        if (!userId) {
            return {
                success: false,
                error: "User not found.",
            };
        }
        if (type === "BAN") {
            await prisma.company_member_table.update({
                where: { company_member_id: memberId },
                data: { company_member_restricted: true },
            });
            await supabaseClient.auth.admin.updateUserById(memberId, {
                ban_duration: "400 days",
            });
        }
        else if (type === "UNBAN") {
            await prisma.company_member_table.update({
                where: { company_member_id: memberId },
                data: { company_member_restricted: false },
            });
            await supabaseClient.auth.admin.updateUserById(memberId, {
                ban_duration: "none",
            });
        }
        await prisma.$executeRaw `
    DELETE FROM auth.sessions
    WHERE user_id = ${userId.company_member_user_id}::uuid
    `;
        return {
            success: true,
            message: "User banned successfully.",
        };
    }
    return userId;
};
export const userSponsorModel = async (params) => {
    const { userId } = params;
    const user = await prisma.$queryRaw `
  SELECT
        ut2.user_username
      FROM user_schema.user_table ut
      JOIN company_schema.company_member_table am
        ON am.company_member_user_id = ut.user_id
      JOIN company_schema.company_referral_table art
        ON art.company_referral_member_id = am.company_member_id
      JOIN company_schema.company_member_table am2
        ON am2.company_member_id = art.company_referral_from_member_id
      JOIN user_schema.user_table ut2
        ON ut2.user_id = am2.company_member_user_id
      WHERE ut.user_id = ${userId}::uuid
  `;
    if (!user) {
        return { success: false, error: "User not found." };
    }
    return user[0].user_username;
};
export const userProfileModelPut = async (params) => {
    const { profilePicture, userId } = params;
    await prisma.$transaction(async (tx) => {
        await tx.user_table.update({
            where: { user_id: userId },
            data: { user_profile_picture: profilePicture },
        });
    });
};
export const userGenerateLinkModel = async (params) => {
    const { formattedUserName } = params;
    const { data, error } = await supabaseClient.auth.admin.generateLink({
        type: "magiclink",
        email: formattedUserName,
    });
    if (error)
        throw error;
    return data.properties;
};
export const userListModel = async (params, teamMemberProfile) => {
    const { page, limit, search, columnAccessor, isAscendingSort, userRole, dateCreated, bannedUser, } = params;
    const offset = (page - 1) * limit;
    const version = (await redis.get(`user-list:version`)) || "v1";
    const cacheKey = `user-list:${page}:${limit}:${search}:${columnAccessor}:${isAscendingSort}:${userRole}:${dateCreated}:${bannedUser}:${version}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const whereCondition = {
        company_member_company_id: teamMemberProfile.company_member_company_id,
    };
    if (search) {
        whereCondition.OR = [
            {
                user_table: {
                    user_username: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            },
            {
                user_table: {
                    user_first_name: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            },
            {
                user_table: {
                    user_last_name: {
                        contains: search,
                        mode: "insensitive",
                    },
                },
            },
        ];
    }
    if (userRole !== "") {
        whereCondition.alliance_member_role = userRole;
    }
    if (dateCreated) {
        whereCondition.user_table = {
            user_date_created: {
                gte: new Date(dateCreated),
                lte: new Date(dateCreated),
            },
        };
    }
    if (bannedUser) {
        whereCondition.alliance_member_restricted = true;
    }
    let orderByCondition = {};
    if (columnAccessor) {
        if (columnAccessor.startsWith("user")) {
            orderByCondition = {
                user_table: {
                    [columnAccessor]: isAscendingSort ? "desc" : "asc",
                },
            };
        }
        else {
            orderByCondition = {
                [columnAccessor]: isAscendingSort ? "desc" : "asc",
            };
        }
    }
    const userRequest = await prisma.company_member_table.findMany({
        where: whereCondition,
        include: {
            user_table: true,
            merchant_member_table: true,
        },
        orderBy: orderByCondition,
        take: limit,
        skip: offset,
    });
    const totalCount = await prisma.company_member_table.count({
        where: whereCondition,
    });
    const formattedData = userRequest.map((entry) => ({
        company_member_id: entry.company_member_id,
        company_member_role: entry.company_member_role,
        company_member_date_created: entry.company_member_date_created.toISOString(),
        company_member_company_id: entry.company_member_company_id,
        company_member_user_id: entry.company_member_user_id,
        company_member_restricted: entry.company_member_restricted,
        company_member_date_updated: entry.company_member_date_updated?.toISOString() || "",
        company_member_is_active: entry.company_member_is_active,
        user_id: entry.user_table.user_id,
        user_username: entry.user_table.user_username || "",
        user_first_name: entry.user_table.user_first_name || "",
        user_last_name: entry.user_table.user_last_name || "",
        user_date_created: entry.user_table.user_date_created.toISOString(),
    }));
    const response = {
        totalCount,
        data: formattedData,
    };
    await redis.set(cacheKey, JSON.stringify(response), { ex: 2 * 60 });
    return response;
};
export const userActiveListModel = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort } = params;
    const cacheKey = `user-active-list:${page}:${limit}:${search}:${columnAccessor}:${isAscendingSort}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const offset = (page - 1) * limit;
    const sortBy = isAscendingSort ? "ASC" : "DESC";
    const orderBy = columnAccessor
        ? Prisma.sql `ORDER BY ${Prisma.raw(columnAccessor)} ${Prisma.raw(sortBy)}`
        : Prisma.empty;
    const searchCondition = search
        ? Prisma.sql `
        AND (
          ut.user_username ILIKE ${`%${search}%`} OR
          ut.user_first_name ILIKE ${`%${search}%`} OR
          ut.user_last_name ILIKE ${`%${search}%`}
        )
      `
        : Prisma.empty;
    const usersWithActiveWallet = await prisma.$queryRaw `
    SELECT
      ut.user_id,
      ut.user_username,
      ut.user_first_name,
      ut.user_last_name,
      am.company_member_is_active
    FROM user_schema.user_table ut
    JOIN company_schema.company_member_table am
      ON ut.user_id = am.company_member_user_id
    LEFT JOIN company_schema.company_earnings_table ae
      ON ae.company_earnings_member_id = am.company_member_id
    WHERE
      ae.company_package_earnings > 0
      ${searchCondition}
      ${orderBy}
    LIMIT ${limit}
    OFFSET ${offset}
  `;
    const totalCount = await prisma.$queryRaw `
    SELECT
      COUNT(*)
    FROM user_schema.user_table ut
    JOIN company_schema.company_member_table am
      ON ut.user_id = am.company_member_user_id
    LEFT JOIN company_schema.company_earnings_table ae
      ON ae.company_earnings_member_id = am.company_member_id
      WHERE
      ae.company_package_earnings > 0
      ${searchCondition}
    `;
    const response = {
        data: usersWithActiveWallet,
        totalCount: Number(totalCount[0]?.count ?? 0),
    };
    await redis.set(cacheKey, JSON.stringify(response), { ex: 2 * 60 });
    return response;
};
export const userChangePasswordModel = async (params) => {
    const { password, userId } = params;
    await supabaseClient.auth.admin.updateUserById(userId, {
        password: password,
    });
};
export const userListReinvestedModel = async (params) => {
    const { dateFilter, take, skip } = params;
    const cacheKey = `user-list-reinvested:${dateFilter.start}:${dateFilter.end}:${take}:${skip}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const offset = (skip - 1) * take;
    const startDate = dateFilter.start
        ? new Date(getPhilippinesTime(new Date(dateFilter.start), "start")).toISOString()
        : getPhilippinesTime(new Date(), "start");
    const endDate = dateFilter.end
        ? getPhilippinesTime(new Date(dateFilter.end), "end")
        : getPhilippinesTime(new Date(), "end");
    const data = await prisma.$queryRaw `
        SELECT
          pml.package_member_member_id,
          pml.package_member_amount,
          pml.package_member_connection_created,
          pml.package_member_status,
          u.user_username,
          u.user_first_name,
          u.user_last_name
      FROM packages_schema.package_member_connection_table pml
      JOIN packages_schema.package_earnings_log pol
          ON pol.package_member_member_id = pml.package_member_member_id
      JOIN company_schema.company_member_table am
          ON am.company_member_id = pml.package_member_member_id
      JOIN user_schema.user_table u
          ON u.user_id = am.company_member_user_id
      WHERE pml.package_member_is_reinvestment = true AND pml.package_member_connection_created::timestamptz
          BETWEEN ${new Date(startDate || new Date()).toISOString()}::timestamptz AND ${new Date(endDate || new Date()).toISOString()}::timestamptz
      GROUP BY
          pml.package_member_member_id,
          pml.package_member_amount,
          pml.package_member_connection_created,
          pml.package_member_status,
          u.user_username,
          u.user_first_name,
          u.user_last_name
      ORDER BY pml.package_member_connection_created DESC
      LIMIT ${take}
      OFFSET ${offset}
`;
    const totalCount = await prisma.$queryRaw `
      SELECT COUNT(*)::INTEGER AS count
      FROM (
          SELECT
              pml.package_member_member_id
          FROM packages_schema.package_member_connection_table pml
          JOIN packages_schema.package_earnings_log pol
          ON pol.package_member_member_id = pml.package_member_member_id
          JOIN company_schema.company_member_table am
              ON am.company_member_id = pml.package_member_member_id
          JOIN user_schema.user_table u
              ON u.user_id = am.company_member_user_id
          WHERE pml.package_member_is_reinvestment = true
            AND pml.package_member_connection_created::timestamptz
          BETWEEN ${new Date(startDate || new Date()).toISOString()}::timestamptz AND ${new Date(endDate || new Date()).toISOString()}::timestamptz
          GROUP BY
            pml.package_member_member_id,
            pml.package_member_amount,
            pml.package_member_connection_created,
            pml.package_member_status,
            u.user_username,
            u.user_first_name,
            u.user_last_name
      ) AS total_count
  `;
    const response = {
        data,
        totalCount: Number(totalCount[0]?.count ?? 0),
    };
    await redis.set(cacheKey, JSON.stringify(response), { ex: 2 * 60 });
    return response;
};
export const userTreeModel = async (params) => {
    const { memberId } = params;
    const cacheKey = `referral-tree-${memberId}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const userTree = await prisma.company_referral_table.findUnique({
        where: { company_referral_member_id: memberId },
        select: {
            company_referral_hierarchy: true,
        },
    });
    if (!userTree || !userTree.company_referral_hierarchy) {
        return { success: false, error: "User not found" };
    }
    const rawHierarchy = userTree.company_referral_hierarchy.split(".");
    const orderedHierarchy = [
        memberId,
        ...rawHierarchy.filter((id) => id !== memberId).reverse(),
    ];
    // Fetch user data from alliance_member_table
    const userTreeData = await prisma.company_member_table.findMany({
        where: { company_member_id: { in: orderedHierarchy } },
        select: {
            company_member_id: true,
            user_table: {
                select: {
                    user_username: true,
                    user_id: true,
                },
            },
        },
    });
    const formattedUserTreeData = orderedHierarchy
        .map((id) => {
        const user = userTreeData.find((user) => user.company_member_id === id);
        return user
            ? {
                company_member_id: user.company_member_id,
                user_id: user.user_table.user_id,
                user_username: user.user_table.user_username,
            }
            : null;
    })
        .filter(Boolean);
    await redis.set(cacheKey, JSON.stringify(formattedUserTreeData), {
        ex: 600,
    });
    return formattedUserTreeData;
};
export const userGetSearchModel = async (params) => {
    const { userName } = params;
    const users = await prisma.user_table.findMany({
        where: {
            user_username: {
                contains: userName,
                mode: "insensitive",
            },
        },
        select: {
            user_id: true,
            user_username: true,
            user_first_name: true,
            user_last_name: true,
            company_member_table: {
                select: {
                    company_member_id: true,
                    company_member_is_active: true,
                    company_member_role: true,
                    company_member_restricted: true,
                },
            },
        },
    });
    if (!users || users.length === 0) {
        return { data: [] };
    }
    const formattedUsers = users.flatMap((user) => user.company_member_table.map((member) => ({
        user_id: user.user_id,
        company_member_id: member.company_member_id,
        user_username: user.user_username,
        user_first_name: user.user_first_name,
        user_last_name: user.user_last_name,
        company_member_is_active: member.company_member_is_active,
        company_member_role: member.company_member_role,
        company_member_restricted: member.company_member_restricted,
    })));
    return { data: formattedUsers };
};
export const userReferralModel = async (params) => {
    const { memberId, dateFilter } = params;
    // Aggregate Direct and Indirect referrals separately
    const referrals = await prisma.package_ally_bounty_log.groupBy({
        by: ["package_ally_bounty_type"],
        where: {
            package_ally_bounty_member_id: memberId,
            package_ally_bounty_log_date_created: {
                gte: getPhilippinesTime(new Date(dateFilter.start), "start"),
                lte: getPhilippinesTime(new Date(dateFilter.end), "end"),
            },
        },
        _sum: { package_ally_bounty_earnings: true },
    });
    // Convert the result into an object with direct & indirect earnings
    const result = {
        directReferral: 0,
        indirectReferral: 0,
    };
    referrals.forEach((entry) => {
        if (entry.package_ally_bounty_type === "DIRECT") {
            result.directReferral = entry._sum.package_ally_bounty_earnings || 0;
        }
        else if (entry.package_ally_bounty_type === "INDIRECT") {
            result.indirectReferral = entry._sum.package_ally_bounty_earnings || 0;
        }
    });
    return result;
};
