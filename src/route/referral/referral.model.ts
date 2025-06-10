import { type company_member_table } from "@prisma/client";
import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";

export const referralDirectModelPost = async (params: {
  page: number;
  limit: number;
  search: string;
  columnAccessor: string;
  isAscendingSort: boolean;
  teamMemberProfile: company_member_table;
}) => {
  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    teamMemberProfile,
  } = params;

  // const version =
  //   (await redis.get(
  //     `referral-direct:${teamMemberProfile.company_member_id}:version`
  //   )) || "v1";

  const cacheKey = `referral-direct-${teamMemberProfile.company_member_id}-${page}-${limit}-${search}-${columnAccessor}`;

  const cachedData = await redis.get(cacheKey);

  if (cachedData) {
    return cachedData;
  }

  const offset = Math.max((page - 1) * limit, 0);

  const directReferrals = await prisma.company_referral_table.findMany({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
      company_member_table: {
        package_member_connection_table: {
          some: {},
        },
      },
    },
    select: {
      company_referral_member_id: true,
      company_referral_date: true,
      company_member_table: {
        select: {
          company_member_id: true,
          package_member_connection_table: {
            select: {
              package_member_connection_id: true,
            },
          },
          user_table: {
            select: {
              user_first_name: true,
              user_last_name: true,
              user_username: true,
            },
          },
        },
      },
    },
    orderBy: {
      company_referral_date: "desc",
    },
    take: limit,
    skip: offset,
  });

  const totalCount = await prisma.company_referral_table.count({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
      company_member_table: {
        package_member_connection_table: {
          some: {},
        },
      },
    },
  });

  // const directReferralIds = directReferrals.map(
  //   (ref) => ref.company_referral_member_id
  // );

  // if (directReferralIds.length === 0) {
  //   return { data: [], totalCount: 0 };
  // }

  // Parameterize search conditions to prevent SQL injection
  // const searchCondition = search
  //   ? Prisma.raw(
  //       `AND (u.user_first_name ILIKE ${
  //         "%" + search + "%"
  //       } OR u.user_last_name ILIKE ${
  //         "%" + search + "%"
  //       } OR u.user_username ILIKE ${"%" + search + "%"})`
  //     )
  //   : Prisma.empty;

  // const direct = await prisma.$queryRaw`

  const formattedDirectReferrals = directReferrals.map((ref) => ({
    user_first_name: ref.company_member_table.user_table.user_first_name,
    user_last_name: ref.company_member_table.user_table.user_last_name,
    user_username: ref.company_member_table.user_table.user_username,
    user_id: ref.company_member_table.company_member_id,
    company_referral_date: ref.company_referral_date,
  }));
  //   SELECT
  //     u.user_first_name,
  //     u.user_last_name,
  //     u.user_username,
  //     u.user_id,
  //     ar.company_referral_date
  //   FROM company_schema.company_member_table m
  //   JOIN user_schema.user_table u ON u.user_id = m.company_member_user_id
  //   JOIN company_schema.company_referral_table ar ON ar.company_referral_member_id = m.company_member_id
  //   WHERE ar.company_referral_from_member_id = ${teamMemberProfile.company_member_id}::uuid
  //     ${searchCondition}
  //   ORDER BY ar.company_referral_date DESC
  //   LIMIT ${limit} OFFSET ${offset}
  // `;

  // const totalCount: { count: number }[] = await prisma.$queryRaw`
  //  SELECT COUNT(*) AS count
  //   FROM (
  //       SELECT 1
  //       FROM company_schema.company_member_table m
  //       JOIN user_schema.user_table u ON u.user_id = m.company_member_user_id
  //       JOIN packages_schema.package_ally_bounty_log pa ON pa.package_ally_bounty_from = m.company_member_id
  //       WHERE pa.package_ally_bounty_member_id = ${teamMemberProfile.company_member_id}::uuid AND pa.package_ally_bounty_type = 'DIRECT'
  //         ${searchCondition}
  //       GROUP BY u.user_first_name, u.user_last_name, u.user_username, pa.package_ally_bounty_log_date_created
  //   ) AS subquery;
  // `;

  const returnData = {
    data: formattedDirectReferrals,
    totalCount: totalCount,
  };

  await redis.set(cacheKey, JSON.stringify(returnData), { ex: 60 * 5 });

  return returnData;
};

export const referralIndirectModelPost = async (params: {
  page: number;
  limit: number;
  search: string;
  columnAccessor: string;
  isAscendingSort: boolean;
  teamMemberProfile: company_member_table;
}) => {
  const {
    page,
    limit,
    search,
    columnAccessor,
    isAscendingSort,
    teamMemberProfile,
  } = params;

  // const version =
  //   (await redis.get(
  //     `indirect-referral:${teamMemberProfile.company_member_id}:version`
  //   )) || "v1";

  const cacheKey = `referral-indirect-${teamMemberProfile.company_member_id}-${page}-${limit}-${search}-${columnAccessor}`;

  // const cachedData = await redis.get(cacheKey);
  // if (cachedData) return cachedData;

  // Step 1: Get direct referral IDs
  const directReferrals = await prisma.company_referral_table.findMany({
    where: {
      company_referral_from_member_id: teamMemberProfile.company_member_id,
    },
    select: {
      company_referral_member_id: true,
    },
  });

  const directReferralIds = directReferrals.map(
    (ref) => ref.company_referral_member_id
  );

  const hierarchyResult: { company_referral_member_id: string }[] =
    await prisma.$queryRaw`
      SELECT ar.company_referral_member_id
      FROM company_schema.company_referral_table ar
      WHERE ar.company_referral_hierarchy LIKE ${
        "%." + teamMemberProfile.company_member_id + ".%"
      }
    `;

  const allDownlineIds = hierarchyResult.map(
    (r) => r.company_referral_member_id
  );

  const finalIndirectReferralIds = allDownlineIds.filter(
    (id) => !directReferralIds.includes(id)
  );

  if (finalIndirectReferralIds.length === 0) {
    return { success: false, message: "No referral data found" };
  }

  const offset = Math.max((page - 1) * limit, 0);

  const indirectReferralDetails = await prisma.$queryRawUnsafe(
    `
    SELECT 
      ut.user_first_name, 
      ut.user_last_name, 
      ut.user_username, 
      ut.user_email,
      am.company_member_id,
      ut.user_date_created,

      ut_ref.user_first_name AS referrer_first_name,
      ut_ref.user_last_name AS referrer_last_name,
      ut_ref.user_username AS referrer_username,
      ut_ref.user_email AS referrer_email

    FROM company_schema.company_member_table am
    JOIN user_schema.user_table ut
      ON ut.user_id = am.company_member_user_id

    JOIN company_schema.company_referral_table cr
      ON cr.company_referral_member_id = am.company_member_id

    JOIN company_schema.company_member_table am_ref
      ON am_ref.company_member_id = cr.company_referral_from_member_id
    JOIN user_schema.user_table ut_ref
      ON ut_ref.user_id = am_ref.company_member_user_id

    WHERE am.company_member_id = ANY($1::uuid[])
    ORDER BY ut.${columnAccessor} ${isAscendingSort ? "ASC" : "DESC"}
    LIMIT $2 OFFSET $3
    `,
    finalIndirectReferralIds,
    limit,
    offset
  );

  const totalCountResult: { count: number }[] = await prisma.$queryRawUnsafe(
    `
    SELECT COUNT(*) AS count
    FROM company_schema.company_referral_table cr
    WHERE cr.company_referral_member_id = ANY($1::uuid[])
    `,
    finalIndirectReferralIds
  );

  const returnData = {
    data: indirectReferralDetails,
    totalCount: Number(totalCountResult[0]?.count || 0),
  };

  await redis.set(cacheKey, JSON.stringify(returnData), { ex: 60 * 5 });

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
