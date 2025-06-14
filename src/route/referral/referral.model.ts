import { Prisma, type company_member_table } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";

export const referralDirectModelPost = async (params: {
  page: number;
  limit: number;
  search: string;
  columnAccessor: string;
  isAscendingSort: boolean;
  teamMemberProfile: company_member_table;
  date: string;
}) => {
  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    teamMemberProfile,
    date,
  } = params;

  const cacheKey = `referral-direct-${teamMemberProfile.company_member_id}-${page}-${limit}-${search}-${columnAccessor}-${date}`;

  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const offset = Math.max((page - 1) * limit, 0);
  const getDateStart = date
    ? getPhilippinesTime(new Date(date), "start")
    : Prisma.empty;
  const getDateEnd = date
    ? getPhilippinesTime(new Date(date), "end")
    : Prisma.empty;

  const directReferrals = await prisma.company_referral_table.findMany({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
    },
    select: {
      company_referral_member_id: true,
      company_referral_date: true,
      company_member_table: {
        select: {
          user_table: {
            select: {
              user_username: true,
            },
          },
        },
      },
    },
  });

  const directReferralIds = directReferrals.map(
    (ref) => ref.company_referral_member_id
  );

  if (directReferralIds.length === 0) {
    return { data: [], totalCount: 0 };
  }

  // Parameterize search conditions to prevent SQL injection
  const searchCondition = search
    ? Prisma.sql`
      AND (
        u.user_first_name ILIKE ${"%" + search + "%"} OR
        u.user_last_name ILIKE ${"%" + search + "%"} OR
        u.user_username ILIKE ${"%" + search + "%"}
      )
    `
    : Prisma.empty;

  const dateCondition = date
    ? Prisma.sql`
      AND pa.package_ally_bounty_log_date_created >= ${getDateStart}::timestamptz AND pa.package_ally_bounty_log_date_created <= ${getDateEnd}::timestamptz
    `
    : Prisma.empty;

  const direct = await prisma.$queryRaw`
    SELECT
      u.user_first_name,
      u.user_last_name,
      u.user_username,
      pa.package_ally_bounty_log_date_created,
      pa.package_ally_bounty_log_id,
      ar.company_referral_date,
      COALESCE(SUM(pa.package_ally_bounty_earnings), 0) AS total_bounty_earnings
    FROM company_schema.company_member_table m
    JOIN user_schema.user_table u ON u.user_id = m.company_member_user_id
    JOIN packages_schema.package_ally_bounty_log pa ON pa.package_ally_bounty_from = m.company_member_id
    JOIN company_schema.company_referral_table ar ON ar.company_referral_member_id = pa.package_ally_bounty_from
    WHERE pa.package_ally_bounty_member_id = ${teamMemberProfile.company_member_id}::uuid AND pa.package_ally_bounty_type = 'DIRECT'
      ${searchCondition}
      ${dateCondition}
    GROUP BY u.user_first_name, u.user_last_name, u.user_username, pa.package_ally_bounty_log_date_created, ar.company_referral_date, pa.package_ally_bounty_log_id
    ORDER BY pa.package_ally_bounty_log_date_created DESC, ar.company_referral_date DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalCount: { count: number }[] = await prisma.$queryRaw`
   SELECT COUNT(*) AS count
    FROM (
        SELECT 1
        FROM company_schema.company_member_table m
        JOIN user_schema.user_table u ON u.user_id = m.company_member_user_id
        JOIN packages_schema.package_ally_bounty_log pa ON pa.package_ally_bounty_from = m.company_member_id
        WHERE pa.package_ally_bounty_member_id = ${teamMemberProfile.company_member_id}::uuid AND pa.package_ally_bounty_type = 'DIRECT'
          ${searchCondition}
          ${dateCondition}
        GROUP BY u.user_first_name, u.user_last_name, u.user_username, pa.package_ally_bounty_log_date_created
    ) AS subquery;
  `;

  const returnData = {
    data: direct,
    totalCount: Number(totalCount[0]?.count || 0),
  };

  await redis.set(cacheKey, JSON.stringify(returnData), { ex: 60 * 2 });

  return returnData;
};

export const referralIndirectModelPost = async (params: {
  page: number;
  limit: number;
  search: string;
  columnAccessor: string;
  isAscendingSort: boolean;
  date: string;
  teamMemberProfile: company_member_table;
}) => {
  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    teamMemberProfile,
    date,
  } = params;

  const cacheKey = `referral-indirect-${teamMemberProfile.company_member_id}-${page}-${limit}-${search}-${columnAccessor}-${isAscendingSort}-${date}`;

  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const getDateStart = date
    ? getPhilippinesTime(new Date(date), "start")
    : Prisma.empty;
  const getDateEnd = date
    ? getPhilippinesTime(new Date(date), "end")
    : Prisma.empty;

  const directReferrals = await prisma.company_referral_table.findMany({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
    },
    select: {
      company_referral_member_id: true,
      company_referral_date: true,
    },
  });

  const directReferralIds = directReferrals.map(
    (ref) => ref.company_referral_member_id
  );

  let indirectReferrals = new Set<string>();
  let currentLevelReferrals = [teamMemberProfile.company_member_id];
  let currentLevel = 0;
  const maxLevel = 10;

  while (currentLevel < maxLevel && currentLevelReferrals.length > 0) {
    const referrerData: { company_referral_hierarchy: string }[] =
      await prisma.$queryRaw`
    SELECT ar.company_referral_hierarchy
    FROM company_schema.company_referral_table ar
    JOIN company_schema.company_referral_link_table al
      ON al.company_referral_link_id = ar.company_referral_link_id
    WHERE al.company_referral_link_member_id = ANY (${currentLevelReferrals}::uuid[])
  `;

    let nextLevelReferrals: string[] = [];
    referrerData.forEach((ref) => {
      const hierarchyArray = ref.company_referral_hierarchy.split(".").slice(1);
      hierarchyArray.forEach((id) => {
        if (
          !indirectReferrals.has(id) &&
          id !== teamMemberProfile.company_member_id
        ) {
          indirectReferrals.add(id);
          nextLevelReferrals.push(id);
        }
      });
    });

    currentLevelReferrals = nextLevelReferrals;
    currentLevel++;
  }

  const finalIndirectReferralIds = Array.from(indirectReferrals).filter(
    (id) => !directReferralIds.includes(id)
  );

  if (finalIndirectReferralIds.length === 0) {
    return { success: false, message: "No referral data found" };
  }

  const offset = Math.max((page - 1) * limit, 0);
  const searchCondition = search
    ? Prisma.sql`
      AND (
        ut.user_first_name ILIKE ${"%" + search + "%"} OR
        ut.user_last_name ILIKE ${"%" + search + "%"} OR
        ut.user_username ILIKE ${"%" + search + "%"}
      )
    `
    : Prisma.empty;

  const dateCondition = date
    ? Prisma.sql`
      AND pa.package_ally_bounty_log_date_created >= ${getDateStart}::timestamptz AND pa.package_ally_bounty_log_date_created <= ${getDateEnd}::timestamptz
    `
    : Prisma.empty;

  const indirectReferralDetails: {
    user_first_name: string;
    user_last_name: string;
    user_username: string;
    package_ally_bounty_log_id: string;
    referrer_username: string;
    total_bounty_earnings: number;
  }[] = await prisma.$queryRaw`
  SELECT 
    ut.user_first_name, 
    ut.user_last_name, 
    ut.user_username, 
    pa.package_ally_bounty_log_id,
    ut2.user_username AS referrer_username,
    COALESCE(SUM(pa.package_ally_bounty_earnings), 0) AS total_bounty_earnings
  FROM company_schema.company_member_table am
  JOIN user_schema.user_table ut
    ON ut.user_id = am.company_member_user_id
  JOIN packages_schema.package_ally_bounty_log pa
    ON am.company_member_id = pa.package_ally_bounty_from
  JOIN company_schema.company_referral_table ar
    ON ar.company_referral_member_id = pa.package_ally_bounty_from
  JOIN company_schema.company_referral_table ar2
    ON ar2.company_referral_member_id = pa.package_ally_bounty_from
  JOIN company_schema.company_member_table am2
    ON am2.company_member_id = ar2.company_referral_from_member_id
  JOIN user_schema.user_table ut2
    ON ut2.user_id = am2.company_member_user_id
  WHERE pa.package_ally_bounty_from = ANY(${finalIndirectReferralIds}::uuid[])
    AND pa.package_ally_bounty_member_id = ${teamMemberProfile.company_member_id}::uuid
    ${searchCondition}
    ${dateCondition}
  GROUP BY 
    ut.user_first_name, 
    ut.user_last_name, 
    ut.user_username, 
    pa.package_ally_bounty_log_id,
    ut2.user_username
  ORDER BY pa.package_ally_bounty_log_date_created DESC
  LIMIT ${limit} OFFSET ${offset}
`;

  const totalCountResult: { count: number }[] = await prisma.$queryRaw`
  SELECT 
    COUNT(*) AS count
  FROM (
    SELECT pa.package_ally_bounty_from
    FROM company_schema.company_member_table am
    JOIN user_schema.user_table ut
      ON ut.user_id = am.company_member_user_id
    JOIN packages_schema.package_ally_bounty_log pa
      ON am.company_member_id = pa.package_ally_bounty_from
    WHERE pa.package_ally_bounty_from = ANY(${finalIndirectReferralIds}::uuid[])
      AND pa.package_ally_bounty_member_id = ${teamMemberProfile.company_member_id}::uuid
      ${searchCondition}
      ${dateCondition}
    GROUP BY 
      pa.package_ally_bounty_from,
      ut.user_first_name,
      ut.user_last_name,
      ut.user_username,
      ut.user_date_created,
      am.company_member_id,
      pa.package_ally_bounty_log_date_created
  ) AS subquery
`;

  const returnData = {
    data: indirectReferralDetails,
    totalCount: Number(totalCountResult[0]?.count || 0),
  };

  await redis.set(cacheKey, returnData, { ex: 300 });

  return returnData;
};

export const newReferralModelPost = async (params: {
  date: string;
  search: string;
  page: number;
  limit: number;
  teamMemberProfile: company_member_table;
}) => {
  const { teamMemberProfile, date, search, page, limit } = params;

  const cacheKey = `new-referral-${teamMemberProfile.company_member_id}-${page}-${limit}-${search}-${date}`;

  const cachedData = await redis.get(cacheKey);

  // if (cachedData) {
  //   return cachedData;
  // }

  const getDateStart = date
    ? getPhilippinesTime(new Date(date), "start")
    : Prisma.empty;
  const getDateEnd = date
    ? getPhilippinesTime(new Date(date), "end")
    : Prisma.empty;

  const offset = Math.max((page - 1) * limit, 0);

  const directReferrals = await prisma.company_referral_table.findMany({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
      ...(search
        ? {
            company_member_table: {
              user_table: {
                OR: [
                  {
                    user_first_name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    user_last_name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                  {
                    user_username: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                ],
              },
            },
          }
        : {}),

      ...(date
        ? {
            company_referral_date: {
              gte: getDateStart as unknown as Date,
              lte: getDateEnd as unknown as Date,
            },
          }
        : {}),
    },
    select: {
      company_referral_member_id: true,
      company_referral_date: true,
      company_member_table: {
        select: {
          user_table: {
            select: {
              user_id: true,
              user_username: true,
              user_first_name: true,
              user_last_name: true,
              user_date_created: true,
            },
          },
        },
      },
    },
    take: limit,
    skip: offset,
    orderBy: {
      company_referral_date: "desc",
    },
  });
  const formattedDirectReferrals = directReferrals.map((referral) => {
    return {
      package_ally_bounty_log_id:
        referral.company_member_table.user_table.user_id,
      user_username: referral.company_member_table.user_table.user_username,
      user_first_name: referral.company_member_table.user_table.user_first_name,
      user_last_name: referral.company_member_table.user_table.user_last_name,
      company_referral_date: referral.company_referral_date,
    };
  });

  const totalCount = await prisma.company_referral_table.count({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
    },
  });

  const returnData = {
    data: formattedDirectReferrals,
    totalCount: Number(totalCount),
  };

  await redis.set(cacheKey, JSON.stringify(returnData), { ex: 300 });

  return returnData;
};

export const referralTotalGetModel = async (params: {
  teamMemberProfile: company_member_table;
}) => {
  const { teamMemberProfile } = params;

  return await prisma.$transaction(async (tx) => {
    const [result] = await tx.$queryRaw<
      Array<{
        package_ally_bounty_member_id: string;
        totalamount: number;
        totalreferral: number;
      }>
    >`
      SELECT
        package_ally_bounty_member_id,
        SUM(package_ally_bounty_earnings) AS totalamount,
        COUNT(DISTINCT package_ally_bounty_from) AS totalreferral
      FROM packages_schema.package_ally_bounty_log
        WHERE package_ally_bounty_member_id::uuid = ${teamMemberProfile.company_member_id}::uuid
      GROUP BY package_ally_bounty_member_id
    `;

    return {
      data: result ? result.totalamount : 0,
    };
  });
};
