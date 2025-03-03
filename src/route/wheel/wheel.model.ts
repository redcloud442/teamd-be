import type { alliance_member_table, Prisma } from "@prisma/client";
import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";

const PRIZE_ID = "a1ea289d-2581-4d73-9655-89f717a88a9d";
const PRIZE_LIMIT = 5;
const NO_REWARD_PRIZE = {
  alliance_wheel_settings_label: "NO REWARD",
  alliance_wheel_settings_id: "NO_REWARD",
  alliance_wheel_settings_percentage: 0,
  alliance_wheel_settings_color: "#000000",
};

async function getRandomPrize(tx: Prisma.TransactionClient) {
  const prizeCounterKey = `prize-count-${PRIZE_ID}`;

  const currentCount = (await redis.get(prizeCounterKey)) as string | null;
  const count = currentCount ? parseInt(currentCount, 10) : 0;

  // Fetch all prizes
  let prizes = await tx.alliance_wheel_settings_table.findMany({
    orderBy: {
      alliance_wheel_settings_percentage: "desc",
    },
  });

  if (count >= PRIZE_LIMIT) {
    prizes = prizes.filter(
      (prize) => prize.alliance_wheel_settings_id !== PRIZE_ID
    );
  }

  if (!prizes.length) return NO_REWARD_PRIZE;

  const totalPercentage = prizes.reduce(
    (sum, prize) => sum + prize.alliance_wheel_settings_percentage,
    0
  );

  if (totalPercentage <= 0) {
    throw new Error("Total percentage must be greater than 0.");
  }

  const random = Math.random() * totalPercentage;
  let cumulativeProbability = 0;

  for (const prize of prizes) {
    cumulativeProbability += prize.alliance_wheel_settings_percentage;

    if (random < cumulativeProbability) {
      if (prize.alliance_wheel_settings_id === PRIZE_ID) {
        const newCount = await redis.incr(prizeCounterKey);

        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(23, 59, 59, 999);
        const secondsUntilMidnight = Math.floor(
          (midnight.getTime() - now.getTime()) / 1000
        );

        if (newCount === 1) {
          await redis.expire(prizeCounterKey, secondsUntilMidnight);
        }
      }

      return prize;
    }
  }

  return prizes[prizes.length - 1];
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
            increment: Number(winningPrize?.alliance_wheel_settings_label),
          },
          alliance_combined_earnings: {
            increment: Number(winningPrize?.alliance_wheel_settings_label),
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
            winningPrize?.alliance_wheel_settings_label
          ),
          transaction_date: new Date(),
          transaction_details: "",
          transaction_description: "Prime Wheel Earnings",
        },
      });
    }

    return {
      prize: winningPrize?.alliance_wheel_settings_label,
      count: wheelLog?.alliance_wheel_spin_count,
    };
  });

  return response;
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
          three_referrals: false,
          ten_referrals: false,
          twenty_five_referrals: false,
          fifty_referrals: false,
          one_hundred_referrals: false,
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

    await tx.alliance_spin_purchase_table.create({
      data: {
        alliance_spin_purchase_member_id: teamMemberProfile.alliance_member_id,
        alliance_spin_purchase_amount: requestedAmount,
        alliance_spin_quantity: quantity,
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
