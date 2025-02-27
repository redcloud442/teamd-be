import type { alliance_member_table, Prisma } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";

async function getRandomPrize(tx: Prisma.TransactionClient) {
  const prizes = await tx.alliance_wheel_settings_table.findMany({
    orderBy: {
      alliance_wheel_settings_percentage: "desc",
    },
  });

  const totalPercentage = prizes.reduce(
    (sum, prize) => sum + prize.alliance_wheel_settings_percentage,
    0
  );

  let cumulativeProbability = 0;
  const random = Math.random() * totalPercentage;

  for (const prize of prizes) {
    cumulativeProbability += prize.alliance_wheel_settings_percentage;
    if (random <= cumulativeProbability) {
      return prize;
    }
  }

  return prizes[prizes.length - 1]; // Fallback
}

export const wheelPostModel = async (params: {
  teamMemberProfile: alliance_member_table;
}) => {
  const { teamMemberProfile } = params;

  const response = await prisma.$transaction(async (tx) => {
    const wheel = await tx.alliance_wheel_table.findFirst({
      where: {
        alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
        alliance_wheel_date: {
          gte: getPhilippinesTime(new Date(), "start"),
          lte: getPhilippinesTime(new Date(), "end"),
        },
      },
      orderBy: {
        alliance_wheel_date: "desc",
      },
      take: 1,
    });

    let wheelLog = await tx.alliance_wheel_log_table.findUnique({
      where: {
        alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
      },
    });
    if (!wheel) {
      wheelLog = await tx.alliance_wheel_log_table.create({
        data: {
          alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
          alliance_wheel_spin_count: 0,
        },
      });
    }
    if (wheelLog?.alliance_wheel_spin_count === 0) {
      throw new Error("You have no spins left");
    }

    const winningPrize = await getRandomPrize(tx);

    if (winningPrize.alliance_wheel_settings_label === "RE-SPIN") {
    } else if (winningPrize.alliance_wheel_settings_label === "NO REWARD") {
      await tx.alliance_wheel_log_table.update({
        where: { alliance_wheel_log_id: wheelLog!.alliance_wheel_log_id },
        data: {
          alliance_wheel_spin_count: {
            decrement: 1,
          },
        },
      });
    } else {
      await tx.alliance_earnings_table.update({
        where: {
          alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
        },
        data: {
          alliance_winning_earnings: {
            increment: Number(winningPrize.alliance_wheel_settings_label),
          },
          alliance_combined_earnings: {
            increment: Number(winningPrize.alliance_wheel_settings_label),
          },
        },
      });
      await tx.alliance_wheel_log_table.update({
        where: { alliance_wheel_log_id: wheelLog!.alliance_wheel_log_id },
        data: {
          alliance_wheel_spin_count: {
            decrement: 1,
          },
        },
      });
      await tx.alliance_transaction_table.create({
        data: {
          transaction_member_id: teamMemberProfile.alliance_member_id,
          transaction_amount: Number(
            winningPrize.alliance_wheel_settings_label
          ),
          transaction_date: new Date(),
          transaction_details: "",
          transaction_description: "Prime Wheel Earnings",
        },
      });
    }

    return {
      prize: winningPrize.alliance_wheel_settings_label,
      count: wheelLog?.alliance_wheel_spin_count,
    };
  });

  return response;
};

export const wheelGetPackageModel = async (params: {
  teamMemberProfile: alliance_member_table;
}) => {
  const { teamMemberProfile } = params;

  const currentDate = new Date();
  const startOfDay = getPhilippinesTime(currentDate, "start");
  const endOfDay = getPhilippinesTime(currentDate, "end");

  const dailyTaskCurrentUser = await prisma.alliance_wheel_table.findFirst({
    where: {
      alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
      alliance_wheel_date: { gte: startOfDay, lte: endOfDay },
    },
  });

  if (dailyTaskCurrentUser?.two_thousand_package_plan) {
    const wheelLog = await prisma.alliance_wheel_log_table.findFirst({
      where: { alliance_wheel_member_id: teamMemberProfile.alliance_member_id },
    });
    return { wheelLog, dailyTask: dailyTaskCurrentUser };
  }

  const sponsor = await prisma.alliance_referral_table.findFirst({
    where: {
      alliance_referral_member_id: teamMemberProfile.alliance_member_id,
    },
    select: { alliance_referral_from_member_id: true },
  });

  if (!sponsor) {
    throw new Error("Sponsor not found.");
  }

  return await prisma.$transaction(async (tx) => {
    const [wheelLog, dailyTask] = await Promise.all([
      tx.alliance_wheel_log_table.findFirst({
        where: {
          alliance_wheel_member_id:
            sponsor.alliance_referral_from_member_id ?? "",
        },
        select: { alliance_wheel_spin_count: true },
      }),
      tx.alliance_wheel_table.findFirst({
        where: {
          alliance_wheel_member_id:
            sponsor.alliance_referral_from_member_id ?? "",
          alliance_wheel_date: { gte: startOfDay, lte: endOfDay },
        },
        select: {
          alliance_wheel_id: true,
          alliance_wheel_date_updated: true,
          two_thousand_package_plan: true,
          three_referrals_count: true,
          ten_direct_referrals_count: true,
          two_hundred_referrals_amount: true,
          five_hundred_referrals_amount: true,
        },
        orderBy: { alliance_wheel_date: "desc" },
        take: 1,
      }),
    ]);

    if (!dailyTask || dailyTaskCurrentUser?.two_thousand_package_plan) {
      return { wheelLog, dailyTask };
    }

    const updatedGteDate = dailyTask.alliance_wheel_date_updated || startOfDay;
    const spinIncrements: number[] = [];
    let columnToUpdate: Record<string, boolean> = {};

    if (
      dailyTask.three_referrals_count &&
      !dailyTask.two_hundred_referrals_amount
    ) {
      const referralEarnings200 = await fetchReferralEarnings(
        tx,
        sponsor.alliance_referral_from_member_id ?? "",
        new Date(updatedGteDate),
        new Date(endOfDay),
        200
      );
      if (referralEarnings200) {
        spinIncrements.push(4);
        columnToUpdate.two_hundred_referrals_amount = true;
      }
    }

    if (
      dailyTask.two_hundred_referrals_amount &&
      !dailyTask.five_hundred_referrals_amount
    ) {
      const referralEarnings500 = await fetchReferralEarnings(
        tx,
        sponsor.alliance_referral_from_member_id ?? "",
        new Date(updatedGteDate),
        new Date(endOfDay),
        500
      );
      if (referralEarnings500) {
        spinIncrements.push(4);
        columnToUpdate.five_hundred_referrals_amount = true;
      }
    }

    if (
      dailyTaskCurrentUser?.five_hundred_referrals_amount &&
      !dailyTaskCurrentUser.two_thousand_package_plan
    ) {
      const packagePlanAmount =
        await tx.package_member_connection_table.aggregate({
          where: {
            package_member_member_id: teamMemberProfile.alliance_member_id,
            package_member_connection_created: {
              gte: updatedGteDate,
              lte: endOfDay,
            },
          },
          _sum: { package_member_amount: true },
        });

      if (
        packagePlanAmount._sum.package_member_amount &&
        packagePlanAmount._sum.package_member_amount > 2500
      ) {
        spinIncrements.push(25);
        columnToUpdate.two_thousand_package_plan = true;
      }
    }

    if (spinIncrements.length === 0) {
      return { wheelLog, dailyTask };
    }

    const totalIncrement = spinIncrements.reduce(
      (sum, increment) => sum + increment,
      0
    );

    await tx.alliance_wheel_log_table.update({
      where: {
        alliance_wheel_member_id:
          totalIncrement === 25
            ? teamMemberProfile.alliance_member_id
            : sponsor.alliance_referral_from_member_id ?? "",
      },
      data: { alliance_wheel_spin_count: { increment: totalIncrement } },
    });

    if (wheelLog) {
      const updatedWheel = await tx.alliance_wheel_table.update({
        where: {
          alliance_wheel_id:
            totalIncrement === 25
              ? dailyTaskCurrentUser?.alliance_wheel_id
              : dailyTask.alliance_wheel_id,
        },
        data: {
          alliance_wheel_date_updated: currentDate,
          ...columnToUpdate,
        },
        select: {
          alliance_wheel_id: true,
          alliance_wheel_date_updated: true,
          two_thousand_package_plan: true,
          three_referrals_count: true,
          ten_direct_referrals_count: true,
          two_hundred_referrals_amount: true,
          five_hundred_referrals_amount: true,
        },
      });

      return { dailyTask: updatedWheel, wheelLog };
    }
  });
};

export const wheelGetModel = async (params: {
  teamMemberProfile: alliance_member_table;
}) => {
  const { teamMemberProfile } = params;

  const currentDate = new Date();
  const startOfDay = getPhilippinesTime(currentDate, "start");
  const endOfDay = getPhilippinesTime(currentDate, "end");

  return await prisma.$transaction(async (tx) => {
    let wheelLog = await tx.alliance_wheel_log_table.findFirst({
      where: {
        alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
      },
      select: {
        alliance_wheel_spin_count: true,
      },
    });

    if (!wheelLog) {
      wheelLog = await tx.alliance_wheel_log_table.create({
        data: {
          alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
        },
      });
    }

    let dailyTask = await tx.alliance_wheel_table.findFirst({
      where: {
        alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
        alliance_wheel_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!dailyTask) {
      dailyTask = await tx.alliance_wheel_table.create({
        data: {
          alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
          alliance_wheel_date: new Date(),
          three_referrals_count: false,
          two_hundred_referrals_amount: false,
          five_hundred_referrals_amount: false,
          ten_direct_referrals_count: false,
          two_thousand_package_plan: false,
        },
      });
    }

    const returnData = { wheelLog, dailyTask };

    return returnData;
  });
};

export const wheelPutModel = async (params: {
  teamMemberProfile: alliance_member_table;
  quantity: number;
}) => {
  const { teamMemberProfile, quantity } = params;

  const earningsData = await prisma.alliance_earnings_table.findUnique({
    where: {
      alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
    },
    select: {
      alliance_olympus_wallet: true,
      alliance_referral_bounty: true,
      alliance_olympus_earnings: true,
      alliance_combined_earnings: true,
      alliance_winning_earnings: true,
    },
  });

  if (!earningsData) {
    throw new Error("Earnings data not found.");
  }

  const {
    alliance_olympus_wallet,
    alliance_olympus_earnings,
    alliance_referral_bounty,
    alliance_combined_earnings,
    alliance_winning_earnings,
  } = earningsData;

  const amount = quantity * 50;
  const combinedEarnings = Number(alliance_combined_earnings.toFixed(2));
  const requestedAmount = Number(amount.toFixed(2));

  if (combinedEarnings < requestedAmount) {
    throw new Error("Insufficient balance in the wallet.");
  }

  const {
    olympusWallet,
    olympusEarnings,
    referralWallet,
    winningEarnings,
    updatedCombinedWallet,
  } = deductFromWallets(
    requestedAmount,
    combinedEarnings,
    Number(alliance_olympus_wallet),
    Number(alliance_olympus_earnings),
    Number(alliance_referral_bounty),
    Number(alliance_winning_earnings)
  );

  const response = await prisma.$transaction(async (tx) => {
    await tx.alliance_earnings_table.update({
      where: {
        alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
      },
      data: {
        alliance_olympus_wallet: olympusWallet,
        alliance_olympus_earnings: olympusEarnings,
        alliance_referral_bounty: referralWallet,
        alliance_winning_earnings: winningEarnings,
        alliance_combined_earnings: updatedCombinedWallet,
      },
    });

    await tx.alliance_wheel_log_table.update({
      where: {
        alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
      },
      data: {
        alliance_wheel_spin_count: {
          increment: quantity,
        },
      },
    });

    await tx.alliance_transaction_table.create({
      data: {
        transaction_member_id: teamMemberProfile.alliance_member_id,
        transaction_amount: requestedAmount,
        transaction_details: `Wheel Purchase: ${quantity} spins`,
        transaction_description: "Wheel Purchase",
      },
    });

    return {
      message: "Wheel updated successfully.",
    };
  });

  return response;
};

export const wheelPutSettingsModel = async (params: {
  params: {
    percentage: number;
    label: string;
    id: string;
    color: string;
  };
}) => {
  const { percentage, label, color, id } = params.params;

  const response = await prisma.$transaction(async (tx) => {
    const wheelSettings = await tx.alliance_wheel_settings_table.update({
      where: {
        alliance_wheel_settings_id: id,
      },
      data: {
        alliance_wheel_settings_percentage: percentage,
        alliance_wheel_settings_label: label,
        alliance_wheel_settings_color: color,
      },
      select: {
        alliance_wheel_settings_percentage: true,
        alliance_wheel_settings_label: true,
        alliance_wheel_settings_color: true,
        alliance_wheel_settings_date: true,
        alliance_wheel_settings_id: true,
      },
    });

    return {
      wheelSettings,
    };
  });

  return response;
};

function deductFromWallets(
  amount: number,
  combinedWallet: number,
  olympusWallet: number,
  olympusEarnings: number,
  referralWallet: number,
  winningEarnings: number
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
  };
}

const fetchReferralEarnings = async (
  tx: any,
  memberId: string,
  gteDate: Date,
  lteDate: Date,
  threshold: number
): Promise<boolean> => {
  const earnings =
    (
      await tx.package_ally_bounty_log.aggregate({
        where: {
          package_ally_bounty_member_id: memberId,
          package_ally_bounty_log_date_created: { gte: gteDate, lte: lteDate },
        },
        _sum: { package_ally_bounty_earnings: true },
      })
    )._sum?.package_ally_bounty_earnings ?? 0;

  return earnings >= threshold;
};
