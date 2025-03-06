import { Prisma, type alliance_member_table } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";

export const packagePostModel = async (params: {
  amount: number;
  packageId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const { amount, packageId, teamMemberProfile } = params;

  const [packageData, earningsData, referralData] = await Promise.all([
    prisma.package_table.findFirst({
      where: { package_id: packageId },
    }),
    prisma.alliance_earnings_table.findUnique({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
    }),
    prisma.alliance_referral_table.findUnique({
      where: {
        alliance_referral_member_id: teamMemberProfile.alliance_member_id,
      },
    }),
  ]);

  if (!packageData) {
    throw new Error("Package not found.");
  }

  if (packageData.package_is_disabled) {
    throw new Error("Package is disabled.");
  }

  if (!earningsData) {
    throw new Error("Earnings record not found.");
  }

  const {
    alliance_olympus_wallet,
    alliance_olympus_earnings,
    alliance_referral_bounty,
    alliance_combined_earnings,
    alliance_winning_earnings,
  } = earningsData;

  const combinedEarnings = Number(alliance_combined_earnings.toFixed(2));
  const requestedAmount = Number(amount.toFixed(2));

  if (requestedAmount > combinedEarnings) {
    throw new Error("Insufficient balance in the wallet.");
  }

  const {
    olympusWallet,
    olympusEarnings,
    referralWallet,
    winningEarnings,
    updatedCombinedWallet,
    isReinvestment,
  } = deductFromWallets(
    requestedAmount,
    combinedEarnings,
    Number(alliance_olympus_wallet),
    Number(alliance_olympus_earnings),
    Number(alliance_referral_bounty),
    Number(alliance_winning_earnings)
  );

  const packagePercentage = new Prisma.Decimal(
    Number(packageData.package_percentage)
  ).div(100);

  const packageAmountEarnings = new Prisma.Decimal(requestedAmount).mul(
    packagePercentage
  );

  const referralChain = generateReferralChain(
    referralData?.alliance_referral_hierarchy ?? null,
    teamMemberProfile.alliance_member_id,
    100
  );

  let bountyLogs: Prisma.package_ally_bounty_logCreateManyInput[] = [];

  let transactionLogs: Prisma.alliance_transaction_tableCreateManyInput[] = [];

  const connectionData = await prisma.$transaction(async (tx) => {
    const connectionData = await tx.package_member_connection_table.create({
      data: {
        package_member_member_id: teamMemberProfile.alliance_member_id,
        package_member_package_id: packageId,
        package_member_amount: Number(requestedAmount.toFixed(2)),
        package_amount_earnings: Number(packageAmountEarnings.toFixed(2)),
        package_member_status: "ACTIVE",
        package_member_completion_date: new Date(
          Date.now() + packageData.packages_days * 24 * 60 * 60 * 1000
        ),
        package_member_is_reinvestment: isReinvestment,
      },
      select: {
        package_member_connection_id: true,
      },
    });

    await tx.alliance_transaction_table.create({
      data: {
        transaction_member_id: teamMemberProfile.alliance_member_id,
        transaction_amount: Number(requestedAmount.toFixed(2)),
        transaction_description: `Package Enrolled: ${packageData.package_name}`,
      },
    });
    if (Number(amount) >= 5000) {
      const baseCount = Math.floor(Number(amount) / 5000) * 2;
      const count = baseCount > 0 ? baseCount : 2;

      await tx.alliance_wheel_log_table.update({
        where: {
          alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
        },
        data: {
          alliance_wheel_spin_count: {
            increment: count,
          },
        },
      });
    }

    await tx.alliance_earnings_table.update({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
      data: {
        alliance_combined_earnings: updatedCombinedWallet,
        alliance_olympus_wallet: olympusWallet,
        alliance_olympus_earnings: olympusEarnings,
        alliance_referral_bounty: referralWallet,
        alliance_winning_earnings: winningEarnings,
      },
    });

    if (referralChain.length > 0) {
      const batchSize = 100;
      const limitedReferralChain = [];
      for (let i = 0; i < referralChain.length; i++) {
        if (referralChain[i].level > 10) break;
        limitedReferralChain.push(referralChain[i]);
      }

      for (let i = 0; i < limitedReferralChain.length; i += batchSize) {
        const batch = limitedReferralChain.slice(i, i + batchSize);

        bountyLogs = batch.map((ref) => {
          const calculatedEarnings =
            (Number(amount) * Number(ref.percentage)) / 100;

          return {
            package_ally_bounty_member_id: ref.referrerId,
            package_ally_bounty_percentage: ref.percentage,
            package_ally_bounty_earnings: calculatedEarnings,
            package_ally_bounty_type: ref.level === 1 ? "DIRECT" : "INDIRECT",
            package_ally_bounty_connection_id:
              connectionData.package_member_connection_id,
            package_ally_bounty_from: teamMemberProfile.alliance_member_id,
          };
        });

        transactionLogs = batch.map((ref) => {
          const calculatedEarnings =
            (Number(amount) * Number(ref.percentage)) / 100;

          return {
            transaction_member_id: ref.referrerId,
            transaction_amount: calculatedEarnings,
            transaction_description:
              ref.level === 1
                ? "Direct Referral"
                : `Multiple Referral Level ${ref.level}`,
          };
        });

        await Promise.all(
          batch.map(async (ref) => {
            if (!ref.referrerId) return;

            const calculatedEarnings =
              (Number(amount) * Number(ref.percentage)) / 100;

            await tx.alliance_earnings_table.update({
              where: { alliance_earnings_member_id: ref.referrerId },
              data: {
                alliance_referral_bounty: {
                  increment: calculatedEarnings,
                },
                alliance_combined_earnings: {
                  increment: calculatedEarnings,
                },
              },
            });
          })
        );
      }
    }

    return connectionData;
  });

  if (connectionData) {
    await Promise.all([
      prisma.package_ally_bounty_log.createMany({ data: bountyLogs }),
      prisma.alliance_transaction_table.createMany({
        data: transactionLogs,
      }),
    ]);
  }

  if (!teamMemberProfile?.alliance_member_is_active) {
    await prisma.alliance_member_table.update({
      where: { alliance_member_id: teamMemberProfile.alliance_member_id },
      data: {
        alliance_member_is_active: true,
        alliance_member_date_updated: new Date(),
      },
    });
  }

  return bountyLogs;
};

export const packageGetModel = async () => {
  const result = await prisma.$transaction(async (tx) => {
    const data = await tx.package_table.findMany({
      select: {
        package_id: true,
        package_name: true,
        package_percentage: true,
        package_description: true,
        packages_days: true,
        package_color: true,
        package_image: true,
      },
    });
    return data;
  });

  return result;
};

export const packageCreatePostModel = async (params: {
  packageName: string;
  packageDescription: string;
  packagePercentage: string;
  packageDays: string;
  packageColor: string;
  packageImage: string;
}) => {
  const {
    packageName,
    packageDescription,
    packagePercentage,
    packageDays,
    packageColor,
    packageImage,
  } = params;

  const checkIfPackageExists = await prisma.package_table.findFirst({
    where: { package_name: packageName },
  });

  if (checkIfPackageExists) {
    throw new Error("Package already exists.");
  }

  const parsedPackagePercentage = parseFloat(packagePercentage);
  const parsedPackageDays = parseInt(packageDays, 10);

  if (isNaN(parsedPackagePercentage) || isNaN(parsedPackageDays)) {
    throw new Error(
      "Invalid number format for packagePercentage or packageDays."
    );
  }

  const result = await prisma.$transaction([
    prisma.package_table.create({
      data: {
        package_name: packageName,
        package_description: packageDescription,
        package_percentage: parsedPackagePercentage,
        packages_days: parsedPackageDays,
        package_color: packageColor ?? "#000000",
        package_image: packageImage,
      },
    }),
  ]);

  return result;
};

export const packageUpdatePutModel = async (params: {
  packageName: string;
  packageDescription: string;
  packagePercentage: string;
  packageIsDisabled: boolean;
  packageDays: string;
  packageColor: string;
  packageId: string;
  package_image: string;
}) => {
  const {
    packageName,
    packageDescription,
    packagePercentage,
    packageIsDisabled,
    packageDays,
    packageColor,
    packageId,
    package_image,
  } = params;

  const updatedPackage = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      return await tx.package_table.update({
        where: { package_id: packageId },
        data: {
          package_name: packageName,
          package_description: packageDescription,
          package_percentage: parseFloat(packagePercentage),
          packages_days: parseInt(packageDays),
          package_is_disabled: packageIsDisabled,
          package_color: packageColor,
          package_image: package_image ? package_image : undefined,
        },
      });
    }
  );
  return updatedPackage;
};

export const claimPackagePostModel = async (params: {
  amount: number;
  earnings: number;
  packageConnectionId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const { amount, earnings, packageConnectionId, teamMemberProfile } = params;
  const currentTimestamp = new Date();

  await prisma.$transaction(async (tx) => {
    const packageConnection =
      await tx.package_member_connection_table.findUnique({
        where: { package_member_connection_id: packageConnectionId },
      });

    if (!packageConnection) {
      throw new Error("Invalid request.");
    }

    const startDate = new Date(
      packageConnection.package_member_connection_created
    );
    const completionDate = packageConnection.package_member_completion_date
      ? new Date(packageConnection.package_member_completion_date)
      : null;

    const elapsedTimeMs = Math.max(
      currentTimestamp.getTime() - startDate.getTime(),
      0
    );
    const totalTimeMs = completionDate
      ? Math.max(completionDate.getTime() - startDate.getTime(), 0)
      : 0;

    let percentage =
      totalTimeMs > 0 ? (elapsedTimeMs / totalTimeMs) * 100 : 100;
    percentage = Math.min(percentage, 100);

    const packageDetails = await tx.package_table.findUnique({
      where: {
        package_id: packageConnection.package_member_package_id,
      },
      select: {
        package_name: true,
      },
    });

    if (!packageDetails) {
      throw new Error("Invalid request.");
    }

    if (
      !packageConnection.package_member_is_ready_to_claim ||
      percentage !== 100
    ) {
      throw new Error("Invalid request. Package is not ready to claim.");
    }

    const totalClaimedAmount =
      packageConnection.package_member_amount +
      packageConnection.package_amount_earnings;

    const totalAmountToBeClaimed = amount + earnings;

    if (totalClaimedAmount !== totalAmountToBeClaimed) {
      throw new Error("Invalid request");
    }

    await tx.package_member_connection_table.update({
      where: { package_member_connection_id: packageConnectionId },
      data: {
        package_member_status: "ENDED",
        package_member_is_ready_to_claim: false,
      },
    });

    await tx.alliance_earnings_table.update({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
      data: {
        alliance_olympus_earnings: { increment: totalClaimedAmount },
        alliance_combined_earnings: { increment: totalClaimedAmount },
      },
    });

    await tx.alliance_transaction_table.create({
      data: {
        transaction_member_id: teamMemberProfile.alliance_member_id,
        transaction_amount: totalClaimedAmount,
        transaction_description: ` ${packageDetails.package_name} Package Claimed`,
      },
    });

    await tx.package_earnings_log.create({
      data: {
        package_member_connection_id: packageConnectionId,
        package_member_package_id: packageConnection.package_member_package_id,
        package_member_member_id: teamMemberProfile.alliance_member_id,
        package_member_connection_created:
          packageConnection.package_member_connection_created,
        package_member_amount: packageConnection.package_member_amount,
        package_member_amount_earnings: earnings,
        package_member_status: "ENDED",
      },
    });
  });
};

export const packageListGetModel = async (params: {
  teamMemberProfile: alliance_member_table;
}) => {
  const { teamMemberProfile } = params;

  const currentTimestamp = new Date();

  const chartData = await prisma.package_member_connection_table.findMany({
    where: {
      package_member_status: "ACTIVE",
      package_member_member_id: teamMemberProfile.alliance_member_id,
    },
    orderBy: {
      package_member_connection_created: "desc",
    },
    include: {
      package_table: {
        select: {
          package_name: true,
          package_color: true,
          packages_days: true,
        },
      },
    },
  });

  const processedData = await Promise.all(
    chartData.map(async (row) => {
      const startDate = new Date(row.package_member_connection_created);
      const completionDate = row.package_member_completion_date
        ? new Date(row.package_member_completion_date)
        : null;

      const elapsedTimeMs = Math.max(
        currentTimestamp.getTime() - startDate.getTime(),
        0
      );
      const totalTimeMs = completionDate
        ? Math.max(completionDate.getTime() - startDate.getTime(), 0)
        : 0;

      let percentage =
        totalTimeMs > 0 ? (elapsedTimeMs / totalTimeMs) * 100 : 100;
      percentage = Math.min(percentage, 100);

      // Calculate current amount
      const initialAmount = row.package_member_amount;
      const profitAmount = row.package_amount_earnings;
      const currentAmount = initialAmount + (profitAmount * percentage) / 100;

      if (percentage === 100 && !row.package_member_is_ready_to_claim) {
        await prisma.package_member_connection_table.update({
          where: {
            package_member_connection_id: row.package_member_connection_id,
          },
          data: { package_member_is_ready_to_claim: true },
        });
      }

      return {
        package: row.package_table.package_name,
        package_color: row.package_table.package_color || "#FFFFFF",
        completion_date: completionDate?.toISOString(),
        amount: Number(row.package_member_amount.toFixed(2)),
        completion: Number(percentage.toFixed(2)),
        package_connection_id: row.package_member_connection_id,
        profit_amount: Number(row.package_amount_earnings.toFixed(2)),
        current_amount: Number(Math.trunc(currentAmount)),
        is_ready_to_claim: percentage === 100,
      };
    })
  );

  return processedData;
};

export const packageListGetAdminModel = async () => {
  const result = await prisma.package_table.findMany({
    select: {
      package_id: true,
      package_name: true,
      package_percentage: true,
      package_description: true,
      packages_days: true,
      package_color: true,
      package_image: true,
    },
  });

  return result;
};

export const packageDailytaskGetModel = async (params: {
  bountyLogs: Prisma.package_ally_bounty_logCreateManyInput[];
}) => {
  const { bountyLogs } = params;
  if (bountyLogs.length === 0) return;

  const memberIds = [
    ...new Set(bountyLogs.map((log) => log.package_ally_bounty_member_id)),
  ];

  const wheelDataPromises = memberIds.map((memberId) =>
    prisma.alliance_wheel_table.upsert({
      where: {
        alliance_wheel_date_alliance_wheel_member_id: {
          alliance_wheel_date: getPhilippinesTime(new Date(), "start"),
          alliance_wheel_member_id: memberId,
        },
      },
      update: {},
      create: {
        alliance_wheel_date: getPhilippinesTime(new Date(), "start"),
        alliance_wheel_member_id: memberId,
      },
    })
  );

  const wheelData = await Promise.all(wheelDataPromises);

  // **Step 2: Create Last Updated Map (Per User)**
  const lastUpdatedMap = new Map(
    wheelData.map((data) => [
      data.alliance_wheel_member_id,
      data.alliance_wheel_date_updated || data.alliance_wheel_date,
    ])
  );

  // **Step 3: Fetch Referral Counts Per User**
  const referralCounts = await Promise.all(
    memberIds.map(async (memberId) => {
      const lastUpdated = lastUpdatedMap.get(memberId) || new Date(0); // Default to earliest date if not found

      const result: {
        package_ally_bounty_member_id: string;
        count: number;
      }[] = await prisma.$queryRaw`
        SELECT 
          package_ally_bounty_member_id,
          COUNT(DISTINCT package_ally_bounty_from) AS count
        FROM packages_schema.package_ally_bounty_log
        INNER JOIN alliance_schema.alliance_referral_table 
          ON alliance_referral_member_id = package_ally_bounty_from
        WHERE package_ally_bounty_member_id = ${memberId}::uuid
        AND package_ally_bounty_log_date_created >= ${lastUpdated}::TIMESTAMP WITHOUT TIME ZONE
        AND alliance_referral_date >= ${lastUpdated}::TIMESTAMP WITHOUT TIME ZONE
        GROUP BY package_ally_bounty_member_id;
      `;

      return result[0] || { package_ally_bounty_member_id: memberId, count: 0 };
    })
  );

  // **Step 4: Convert Referral Counts to Map**
  const referralCountMap = new Map(
    referralCounts.map((r) => [r.package_ally_bounty_member_id, r.count])
  );

  // **Step 5: Determine New Spin Counts**
  const updates = memberIds.map((memberId) => {
    const referralCount = referralCountMap.get(memberId) || 0;
    const wheel = wheelData.find(
      (w) => w.alliance_wheel_member_id === memberId
    );

    let newSpinCount = 0;
    const updates: Record<string, boolean | Date> = {};

    if (referralCount >= 3 && !wheel?.three_referrals) {
      newSpinCount = 3;
      updates.three_referrals = true;
      updates.alliance_wheel_date_updated = new Date();
    }
    if (
      referralCount >= 10 &&
      !wheel?.ten_referrals &&
      wheel?.three_referrals
    ) {
      newSpinCount = 5;
      updates.ten_referrals = true;
      updates.alliance_wheel_date_updated = new Date();
    }
    if (
      referralCount >= 25 &&
      !wheel?.twenty_five_referrals &&
      wheel?.ten_referrals
    ) {
      newSpinCount = 15;
      updates.twenty_five_referrals = true;
      updates.alliance_wheel_date_updated = new Date();
    }
    if (
      referralCount >= 50 &&
      !wheel?.fifty_referrals &&
      wheel?.twenty_five_referrals
    ) {
      newSpinCount = 35;
      updates.fifty_referrals = true;
      updates.alliance_wheel_date_updated = new Date();
    }
    if (
      referralCount >= 100 &&
      !wheel?.one_hundred_referrals &&
      wheel?.fifty_referrals
    ) {
      newSpinCount = 50;
      updates.one_hundred_referrals = true;
      updates.alliance_wheel_date_updated = new Date();
    }

    return { memberId, newSpinCount, updates };
  });

  const upsertWheelQueries = updates.map(({ memberId, updates }) =>
    prisma.alliance_wheel_table.upsert({
      where: {
        alliance_wheel_date_alliance_wheel_member_id: {
          alliance_wheel_date: getPhilippinesTime(new Date(), "start"),
          alliance_wheel_member_id: memberId,
        },
      },
      update: updates,
      create: {
        alliance_wheel_member_id: memberId,
        alliance_wheel_date: getPhilippinesTime(new Date(), "start"),
        ...updates,
      },
    })
  );

  const updateSpinCountQueries = updates
    .filter(({ newSpinCount }) => newSpinCount > 0)
    .map(({ memberId, newSpinCount }) =>
      prisma.alliance_wheel_log_table.upsert({
        where: { alliance_wheel_member_id: memberId },
        update: { alliance_wheel_spin_count: { increment: newSpinCount } },
        create: {
          alliance_wheel_member_id: memberId,
          alliance_wheel_spin_count: newSpinCount,
        },
      })
    );

  await prisma.$transaction([...upsertWheelQueries, ...updateSpinCountQueries]);
};

function generateReferralChain(
  hierarchy: string | null,
  teamMemberId: string,
  maxDepth = 100
) {
  if (!hierarchy) return [];

  const hierarchyArray = hierarchy.split(".");
  const currentIndex = hierarchyArray.indexOf(teamMemberId);

  if (currentIndex === -1) {
    throw new Error("Current member ID not found in the hierarchy.");
  }

  return hierarchyArray
    .slice(0, currentIndex)
    .reverse()
    .slice(0, maxDepth)
    .map((referrerId, index) => ({
      referrerId,
      percentage: getBonusPercentage(index + 1),
      level: index + 1,
    }));
}

function getBonusPercentage(level: number): number {
  const bonusMap: Record<number, number> = {
    1: 10,
    2: 3,
    3: 2,
    4: 1,
    5: 1,
    6: 1,
    7: 1,
    8: 1,
    9: 1,
    10: 1,
  };

  return bonusMap[level] || 0;
}

function deductFromWallets(
  amount: number,
  combinedWallet: number,
  olympusWallet: number,
  olympusEarnings: number,
  referralWallet: number,
  winningEarnings: number
) {
  let remaining = amount;
  let isReinvestment = false;

  // Validate total funds
  if (combinedWallet < amount) {
    throw new Error("Insufficient balance in combined wallet.");
  }

  // Deduct from Olympus Wallet first
  if (olympusWallet >= remaining) {
    olympusWallet -= remaining;
    remaining = 0;
  } else {
    remaining -= olympusWallet;
    olympusWallet = 0;
  }

  // Deduct from Olympus Earnings next
  if (remaining > 0) {
    if (olympusEarnings >= remaining) {
      isReinvestment = true;
      olympusEarnings -= remaining;
      remaining = 0;
    } else {
      isReinvestment = true;
      remaining -= olympusEarnings;
      olympusEarnings = 0;
    }
  }

  // Deduct from Referral Wallet
  if (remaining > 0) {
    if (referralWallet >= remaining) {
      referralWallet -= remaining;
      remaining = 0;
    } else {
      remaining -= referralWallet;
      referralWallet = 0;
    }
  }

  if (remaining > 0) {
    if (winningEarnings >= remaining) {
      winningEarnings -= remaining;
      remaining = 0;
    } else {
      remaining -= winningEarnings;
      winningEarnings = 0;
    }
  }

  // If any balance remains, throw an error
  if (remaining > 0) {
    throw new Error("Insufficient funds to complete the transaction.");
  }

  // Return updated balances and remaining combined wallet
  return {
    olympusWallet,
    olympusEarnings,
    referralWallet,
    winningEarnings,
    updatedCombinedWallet: combinedWallet - amount,
    isReinvestment,
  };
}
