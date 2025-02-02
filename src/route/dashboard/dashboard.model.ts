import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const dashboardPostModel = async (params: {
  dateFilter: { start?: string; end?: string };
}) => {
  return await prisma.$transaction(async (tx) => {
    const { dateFilter } = params;

    const startDate = dateFilter.start
      ? new Date(dateFilter.start)
      : (() => {
          const today = new Date();
          today.setUTCFullYear(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          );
          today.setUTCHours(0, 0, 0, 0);
          return today;
        })();

    const endDate = dateFilter.end
      ? (() => {
          const end = new Date(dateFilter.end);
          end.setUTCFullYear(
            end.getUTCFullYear(),
            end.getUTCMonth(),
            end.getUTCDate()
          );
          end.setUTCHours(23, 59, 59, 999);
          return end;
        })()
      : (() => {
          const end = new Date();
          end.setUTCFullYear(
            end.getUTCFullYear(),
            end.getUTCMonth(),
            end.getUTCDate()
          );
          end.setUTCHours(23, 59, 59, 999);
          return end;
        })();

    const [
      totalEarnings,
      packageEarnings,
      totalActivatedUserByDate,
      totalApprovedWithdrawal,
      totalWithdraw,
      bountyEarnings,
      activePackageWithinTheDay,
      chartDataRaw,
    ] = await Promise.all([
      tx.alliance_top_up_request_table.aggregate({
        _sum: { alliance_top_up_request_amount: true },
        where: {
          alliance_top_up_request_date_updated: {
            gte: startDate,
            lte: endDate,
          },
          alliance_top_up_request_status: "APPROVED",
        },
      }),

      tx.package_member_connection_table.aggregate({
        _sum: { package_member_amount: true, package_amount_earnings: true },
        where: {
          package_member_connection_created: { gte: startDate, lte: endDate },
        },
      }),

      tx.alliance_member_table.count({
        where: {
          alliance_member_is_active: true,
          alliance_member_date_updated: { gte: startDate, lte: endDate },
        },
      }),

      tx.alliance_withdrawal_request_table.count({
        where: {
          alliance_withdrawal_request_status: "APPROVED",
          alliance_withdrawal_request_date_updated: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      tx.alliance_withdrawal_request_table.aggregate({
        _sum: { alliance_withdrawal_request_amount: true },
        where: {
          alliance_withdrawal_request_status: "APPROVED",
          alliance_withdrawal_request_date_updated: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      tx.package_ally_bounty_log.groupBy({
        by: ["package_ally_bounty_type"],
        _sum: { package_ally_bounty_earnings: true },
        where: {
          package_ally_bounty_log_date_created: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      tx.package_member_connection_table.count({
        where: {
          package_member_connection_created: { gte: startDate, lte: endDate },
        },
      }),

      tx.$queryRaw`
        WITH daily_earnings AS (
          SELECT DATE_TRUNC('day', alliance_top_up_request_date) AS date,
                 SUM(COALESCE(alliance_top_up_request_amount, 0)) AS earnings
          FROM alliance_schema.alliance_top_up_request_table
          WHERE alliance_top_up_request_date::date BETWEEN ${startDate} AND ${endDate}
          AND alliance_top_up_request_status = 'APPROVED'

          GROUP BY DATE_TRUNC('day', alliance_top_up_request_date)
        ),
        daily_withdraw AS (
          SELECT DATE_TRUNC('day', alliance_withdrawal_request_date) AS date,
                 SUM(COALESCE(alliance_withdrawal_request_amount, 0) - COALESCE(alliance_withdrawal_request_fee, 0)) AS withdraw
          FROM alliance_schema.alliance_withdrawal_request_table
          WHERE alliance_withdrawal_request_date::date BETWEEN ${startDate} AND ${endDate}
                AND alliance_withdrawal_request_status = 'APPROVED'
          GROUP BY DATE_TRUNC('day', alliance_withdrawal_request_date)
        )
        SELECT COALESCE(e.date, w.date) AS date,
               COALESCE(e.earnings, 0) AS earnings,
               COALESCE(w.withdraw, 0) AS withdraw
        FROM daily_earnings e
        FULL OUTER JOIN daily_withdraw w ON e.date = w.date
        ORDER BY date;
      `,
    ]);

    const directLoot =
      bountyEarnings.find((e) => e.package_ally_bounty_type === "DIRECT")?._sum
        .package_ally_bounty_earnings || 0;
    const indirectLoot =
      bountyEarnings.find((e) => e.package_ally_bounty_type === "INDIRECT")
        ?._sum.package_ally_bounty_earnings || 0;

    const chartData = (
      chartDataRaw as Array<{ date: Date; earnings: number; withdraw: number }>
    ).map((row) => ({
      date: new Date(row.date).toISOString().split("T")[0],
      earnings: row.earnings || 0,
      withdraw: row.withdraw || 0,
    }));

    return {
      totalEarnings: totalEarnings._sum.alliance_top_up_request_amount || 0,
      totalWithdraw: totalWithdraw._sum.alliance_withdrawal_request_amount || 0,
      directLoot,
      indirectLoot,
      packageEarnings:
        (packageEarnings._sum.package_member_amount || 0) +
        (packageEarnings._sum.package_amount_earnings || 0),
      totalApprovedWithdrawal,
      totalActivatedUserByDate,
      activePackageWithinTheDay,
      chartData,
    };
  });
};

export const dashboardGetModel = async () => {
  const [totalActivatedPackage, numberOfRegisteredUser, totalActivatedUser] =
    await prisma.$transaction([
      prisma.package_member_connection_table.count(),

      prisma.alliance_member_table.count(),

      prisma.alliance_member_table.count({
        where: { alliance_member_is_active: true },
      }),
    ]);

  return {
    numberOfRegisteredUser,
    totalActivatedPackage,
    totalActivatedUser,
  };
};
