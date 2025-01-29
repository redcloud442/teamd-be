import { Prisma, type alliance_member_table } from "@prisma/client";
import prisma from "../../utils/prisma.js";

export const packagePostModel = async (params: {
  amount: number;
  packageId: string;
  teamMemberProfile: alliance_member_table;
}) => {
  const { amount, packageId, teamMemberProfile } = params;

  const [packageData, earningsData, referralData] = await Promise.all([
    prisma.package_table.findUnique({
      where: { package_id: packageId },
      select: {
        package_percentage: true,
        packages_days: true,
        package_is_disabled: true,
        package_name: true,
      },
    }),
    prisma.alliance_earnings_table.findUnique({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
      select: {
        alliance_olympus_wallet: true,
        alliance_referral_bounty: true,
        alliance_olympus_earnings: true,
        alliance_combined_earnings: true,
      },
    }),
    prisma.alliance_referral_table.findFirst({
      where: {
        alliance_referral_member_id: teamMemberProfile.alliance_member_id,
      },
      select: { alliance_referral_hierarchy: true },
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
  } = earningsData;

  const combinedEarnings = Number(alliance_combined_earnings.toFixed(2));
  const requestedAmount = Number(amount.toFixed(2));

  if (combinedEarnings < requestedAmount) {
    throw new Error("Insufficient balance in the wallet.");
  }

  const {
    olympusWallet,
    olympusEarnings,
    referralWallet,
    updatedCombinedWallet,
  } = deductFromWallets(
    requestedAmount,
    combinedEarnings,
    Number(alliance_olympus_wallet),
    Number(alliance_olympus_earnings),
    Number(alliance_referral_bounty)
  );

  const packagePercentage = new Prisma.Decimal(
    Number(packageData.package_percentage)
  ).div(100);

  const packageAmountEarnings = new Prisma.Decimal(requestedAmount).mul(
    packagePercentage
  );

  // Generate referral chain with a capped depth
  const referralChain = generateReferralChain(
    referralData?.alliance_referral_hierarchy ?? null,
    teamMemberProfile.alliance_member_id,
    100 // Cap the depth to 100 levels
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
      },
    });

    await tx.alliance_transaction_table.create({
      data: {
        transaction_member_id: teamMemberProfile.alliance_member_id,
        transaction_amount: Number(requestedAmount.toFixed(2)),
        transaction_description: `Package Enrolled: ${packageData.package_name}`,
      },
    });

    await tx.alliance_earnings_table.update({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
      data: {
        alliance_combined_earnings: updatedCombinedWallet,
        alliance_olympus_wallet: olympusWallet,
        alliance_olympus_earnings: olympusEarnings,
        alliance_referral_bounty: referralWallet,
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
          // Calculate earnings based on ref.percentage and round to the nearest integer
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
            transaction_description: "Refer & Earn",
          };
        });

        await Promise.all(
          batch.map((ref) => {
            const calculatedEarnings =
              (Number(amount) * Number(ref.percentage)) / 100;

            tx.alliance_earnings_table.update({
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
      },
    });
  }

  return true;
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

  await prisma.$transaction(async (tx) => {
    const packageConnection =
      await tx.package_member_connection_table.findUnique({
        where: { package_member_connection_id: packageConnectionId },
      });

    if (!packageConnection) {
      throw new Error("Invalid request.");
    }

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

    // if (!packageConnection.package_member_is_ready_to_claim) {
    //   throw new Error("Invalid request. Package is not ready to claim.");
    // }

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

  const returnData = await prisma.$transaction(async (tx) => {
    const chartData = await tx.package_member_connection_table.findMany({
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
          totalTimeMs > 0 ? (elapsedTimeMs / totalTimeMs) * 100 : 100.0;
        percentage = Math.min(percentage, 100);

        const isReadyToClaim = percentage === 100;

        if (isReadyToClaim) {
          await tx.package_member_connection_table.update({
            where: {
              package_member_connection_id: row.package_member_connection_id,
            },
            data: { package_member_is_ready_to_claim: true },
          });
        }

        return {
          package: row.package_table.package_name,
          package_color: row.package_table.package_color,
          completion_date: completionDate?.toISOString(),
          amount: row.package_member_amount,
          completion: percentage.toFixed(2),
          package_connection_id: row.package_member_connection_id,
          profit_amount: row.package_amount_earnings,
          // is_ready_to_claim: isReadyToClaim,
          is_ready_to_claim: true,
        };
      })
    );

    return processedData;
  });

  return returnData;
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
  referralWallet: number
) {
  let remaining = amount;

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
      olympusEarnings -= remaining;
      remaining = 0;
    } else {
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

  // If any balance remains, throw an error
  if (remaining > 0) {
    throw new Error("Insufficient funds to complete the transaction.");
  }

  // Return updated balances and remaining combined wallet
  return {
    olympusWallet,
    olympusEarnings,
    referralWallet,
    updatedCombinedWallet: combinedWallet - amount,
  };
}
