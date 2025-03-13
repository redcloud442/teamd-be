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
    Number(alliance_olympus_wallet.toFixed(2)),
    Number(alliance_olympus_earnings.toFixed(2)),
    Number(alliance_referral_bounty.toFixed(2)),
    Number(alliance_winning_earnings.toFixed(2))
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

    if (bountyLogs.length > 0) {
      await tx.package_ally_bounty_log.createMany({ data: bountyLogs });
    }

    if (transactionLogs.length > 0) {
      await tx.alliance_transaction_table.createMany({
        data: transactionLogs,
      });
    }

    if (!teamMemberProfile?.alliance_member_is_active) {
      await tx.alliance_member_table.update({
        where: { alliance_member_id: teamMemberProfile.alliance_member_id },
        data: {
          alliance_member_is_active: true,
          alliance_member_date_updated: new Date(),
        },
      });
    }

    return connectionData;
  });

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

  const memberIds = Array.from(
    new Set(bountyLogs.map((log) => log.package_ally_bounty_member_id))
  );

  const startDate = getPhilippinesTime(new Date(), "start");

  await prisma.alliance_wheel_table.createMany({
    data: memberIds.map((memberId) => ({
      alliance_wheel_date: startDate,
      alliance_wheel_member_id: memberId,
    })),
    skipDuplicates: true,
  });

  const wheelData = await prisma.alliance_wheel_table.findMany({
    where: {
      alliance_wheel_member_id: { in: memberIds },
    },
    select: {
      alliance_wheel_member_id: true,
      alliance_wheel_date_updated: true,
      alliance_wheel_date: true,
    },
  });

  const lastUpdatedMap = new Map(
    (
      wheelData as unknown as {
        alliance_wheel_member_id: string;
        alliance_wheel_date_updated?: Date;
        alliance_wheel_date: Date;
      }[]
    ).map((data) => [
      data.alliance_wheel_member_id,
      data.alliance_wheel_date_updated || data.alliance_wheel_date,
    ])
  );

  console.log(memberIds);
  const referralCounts = await Promise.all(
    memberIds.map(async (memberId) => {
      const lastUpdated = lastUpdatedMap.get(memberId) || new Date(0);
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
        AND package_ally_bounty_log_date_created >= ${lastUpdated}::TIMESTAMP AT TIME ZONE 'UTC'
        AND alliance_referral_date >= ${lastUpdated}::TIMESTAMP AT TIME ZONE 'UTC'
        GROUP BY package_ally_bounty_member_id;
      `;
      return result[0] || { package_ally_bounty_member_id: memberId, count: 0 };
    })
  );

  const referralCountMap = new Map(
    referralCounts.map((r) => [r.package_ally_bounty_member_id, r.count])
  );

  const transactions: Prisma.alliance_transaction_tableCreateManyInput[] = [];
  const updates: Record<string, boolean | Date>[] = [];
  const spinCounts: { memberId: string; spinCount: number }[] = [];

  memberIds.forEach((memberId) => {
    const referralCount = referralCountMap.get(memberId) || 0;
    let newSpinCount = 0;
    const updateFields: Record<string, boolean | Date> = {};

    if (referralCount >= 3 && !updateFields.three_referrals) {
      newSpinCount = 3;
      updateFields.three_referrals = true;
      updateFields.alliance_wheel_date_updated = new Date();
    }
    if (referralCount >= 10 && updateFields.three_referrals) {
      newSpinCount = 5;
      updateFields.ten_referrals = true;
      updateFields.alliance_wheel_date_updated = new Date();
    }
    if (referralCount >= 25 && updateFields.ten_referrals) {
      newSpinCount = 15;
      updateFields.twenty_five_referrals = true;
      updateFields.alliance_wheel_date_updated = new Date();
    }
    if (referralCount >= 50 && updateFields.twenty_five_referrals) {
      newSpinCount = 35;
      updateFields.fifty_referrals = true;
      updateFields.alliance_wheel_date_updated = new Date();
    }
    if (
      referralCount >= 100 &&
      updateFields.fifty_referrals &&
      !updateFields.one_hundred_referrals
    ) {
      newSpinCount = 50;
      updateFields.one_hundred_referrals = true;
      updateFields.alliance_wheel_date_updated = new Date();
    }

    if (newSpinCount > 0) {
      updateFields.alliance_wheel_date_updated = new Date();
      spinCounts.push({ memberId, spinCount: newSpinCount });
      transactions.push({
        transaction_amount: 0,
        transaction_description: `Daily task + ${newSpinCount} spins`,
        transaction_member_id: memberId,
      });
    }
    if (Object.keys(updateFields).length > 0) {
      updates.push({ ...updateFields });
    }
  });
  console.log(transactions);
  console.log(updates);
  console.log(spinCounts);

  if (transactions.length > 0) {
    await prisma.alliance_transaction_table.createMany({ data: transactions });
  }

  if (updates.length > 0) {
    await prisma.$executeRaw`
      UPDATE alliance_schema.alliance_wheel_table
      SET
        three_referrals = CASE 
          WHEN alliance_wheel_member_id = ANY(${memberIds}::uuid[]) 
          THEN ${updates.some((u) => u.three_referrals) ? true : false}
          ELSE three_referrals 
        END,
        ten_referrals = CASE 
          WHEN alliance_wheel_member_id = ANY(${memberIds}::uuid[]) 
          THEN ${updates.some((u) => u.ten_referrals) ? true : false}
          ELSE ten_referrals 
        END,
        twenty_five_referrals = CASE 
          WHEN alliance_wheel_member_id = ANY(${memberIds}::uuid[]) 
          THEN ${updates.some((u) => u.twenty_five_referrals) ? true : false}
          ELSE twenty_five_referrals 
        END,
        fifty_referrals = CASE 
          WHEN alliance_wheel_member_id = ANY(${memberIds}::uuid[]) 
          THEN ${updates.some((u) => u.fifty_referrals) ? true : false}
          ELSE fifty_referrals 
        END,
        one_hundred_referrals = CASE 
          WHEN alliance_wheel_member_id = ANY(${memberIds}::uuid[]) 
          THEN ${updates.some((u) => u.one_hundred_referrals) ? true : false}
          ELSE one_hundred_referrals 
        END,
        alliance_wheel_date_updated = CASE 
          WHEN alliance_wheel_member_id = ANY(${memberIds}::uuid[]) 
          THEN ${
            updates.some((u) => u.alliance_wheel_date_updated)
              ? new Date()
              : null
          }
          ELSE alliance_wheel_date_updated 
        END
      WHERE alliance_wheel_member_id = ANY(${memberIds}::uuid[]);
    `;
  }

  if (spinCounts.length > 0) {
    await prisma.$executeRawUnsafe(`
      UPDATE alliance_schema.alliance_wheel_log_table
      SET alliance_wheel_spin_count = alliance_wheel_spin_count + subquery.spinCount
      FROM (VALUES
        ${spinCounts.map((s) => `('${s.memberId}', ${s.spinCount})`).join(", ")}
      ) AS subquery(memberId, spinCount)
      WHERE alliance_wheel_log_table.alliance_wheel_member_id = subquery.memberId::uuid;
    `);
  }
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

  console.log(remaining);
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
