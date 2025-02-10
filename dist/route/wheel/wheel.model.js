import { getPhilippinesTime } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
const prizes = [
    { label: 25, percentage: 5 },
    { label: 50, percentage: 4 },
    { label: 150, percentage: 2 },
    { label: 1000, percentage: 1 },
    { label: 10000, percentage: 0.01 },
    { label: "RE-SPIN", percentage: 6 },
    { label: "NO REWARD", percentage: 10 },
];
function getRandomPrize() {
    const totalPercentage = prizes.reduce((sum, prize) => sum + prize.percentage, 0);
    const normalizedPrizes = prizes.map((prize) => ({
        ...prize,
        normalizedPercentage: prize.percentage / totalPercentage,
    }));
    const random = Math.random();
    let cumulativeProbability = 0;
    for (const prize of normalizedPrizes) {
        cumulativeProbability += prize.normalizedPercentage;
        if (random <= cumulativeProbability) {
            return prize;
        }
    }
    return normalizedPrizes[normalizedPrizes.length - 1];
}
export const wheelPostModel = async (params) => {
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
        const winningPrize = getRandomPrize();
        if (winningPrize.label === "RE-SPIN") {
        }
        else if (winningPrize.label === "NO REWARD") {
            await tx.alliance_wheel_log_table.update({
                where: { alliance_wheel_log_id: wheelLog.alliance_wheel_log_id },
                data: {
                    alliance_wheel_spin_count: {
                        decrement: 1,
                    },
                },
            });
        }
        else {
            await tx.alliance_earnings_table.update({
                where: {
                    alliance_earnings_member_id: teamMemberProfile.alliance_member_id,
                },
                data: {
                    alliance_winning_earnings: {
                        increment: Number(winningPrize.label),
                    },
                    alliance_combined_earnings: {
                        increment: Number(winningPrize.label),
                    },
                },
            });
            await tx.alliance_wheel_log_table.update({
                where: { alliance_wheel_log_id: wheelLog.alliance_wheel_log_id },
                data: {
                    alliance_wheel_spin_count: {
                        decrement: 1,
                    },
                },
            });
            await tx.alliance_transaction_table.create({
                data: {
                    transaction_member_id: teamMemberProfile.alliance_member_id,
                    transaction_amount: Number(winningPrize.label),
                    transaction_date: new Date(),
                    transaction_details: "",
                    transaction_description: "Prime Wheel Earnings",
                },
            });
        }
        return {
            prize: winningPrize.label,
            count: wheelLog?.alliance_wheel_spin_count,
        };
    });
    return response;
};
export const wheelGetModel = async (params) => {
    const { teamMemberProfile } = params;
    const cacheKey = `wheel-${teamMemberProfile.alliance_member_id}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    return await prisma.$transaction(async (tx) => {
        let wheelLog = await tx.alliance_wheel_log_table.upsert({
            where: {
                alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
            },
            update: {},
            create: {
                alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
                alliance_wheel_spin_count: 0,
            },
            select: {
                alliance_wheel_spin_count: true,
            },
        });
        const [dailyTask] = await Promise.all([
            tx.alliance_wheel_table.findFirst({
                where: {
                    alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
                    alliance_wheel_date: {
                        gte: getPhilippinesTime(new Date(), "start"),
                        lte: getPhilippinesTime(new Date(), "end"),
                    },
                },
                select: {
                    alliance_wheel_id: true,
                    two_thousand_package_plan: true,
                    three_referrals_count: true,
                    ten_direct_referrals_count: true,
                    two_hundred_referrals_amount: true,
                    five_hundred_referrals_amount: true,
                },
                orderBy: {
                    alliance_wheel_date: "desc",
                },
                take: 1,
            }) ??
                tx.alliance_wheel_table.create({
                    data: {
                        alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
                    },
                }),
        ]);
        const packagePlanAmount = (await prisma.package_member_connection_table.aggregate({
            where: {
                package_member_connection_id: teamMemberProfile.alliance_member_id,
                package_member_connection_created: {
                    gte: getPhilippinesTime(new Date(), "start"),
                    lte: getPhilippinesTime(new Date(), "end"),
                },
            },
            _sum: {
                package_member_amount: true,
            },
        }))._sum?.package_member_amount ?? 0;
        const spinIncrements = [];
        if (packagePlanAmount > 2500 && !dailyTask?.two_thousand_package_plan) {
            await tx.alliance_wheel_table.update({
                where: {
                    alliance_wheel_id: dailyTask?.alliance_wheel_id,
                },
                data: {
                    two_thousand_package_plan: true,
                },
            });
            spinIncrements.push(25);
        }
        // Count referrals for the current day
        const referralCount = await prisma.alliance_referral_table.count({
            where: {
                alliance_referral_from_member_id: teamMemberProfile.alliance_member_id,
                alliance_referral_date: {
                    gte: getPhilippinesTime(new Date(), "start"),
                    lte: getPhilippinesTime(new Date(), "end"),
                },
            },
        });
        if (referralCount > 3 && !dailyTask?.three_referrals_count) {
            await tx.alliance_wheel_table.update({
                where: {
                    alliance_wheel_id: dailyTask?.alliance_wheel_id,
                },
                data: {
                    three_referrals_count: true,
                },
            });
            spinIncrements.push(2);
        }
        if (referralCount > 10 && !dailyTask?.ten_direct_referrals_count) {
            await tx.alliance_wheel_table.update({
                where: {
                    alliance_wheel_id: dailyTask?.alliance_wheel_id,
                },
                data: {
                    ten_direct_referrals_count: true,
                },
            });
            spinIncrements.push(20);
        }
        const referralEarnings = (await prisma.package_ally_bounty_log.aggregate({
            where: {
                package_ally_bounty_member_id: teamMemberProfile.alliance_member_id,
                package_ally_bounty_log_date_created: {
                    gte: getPhilippinesTime(new Date(), "start"),
                    lte: getPhilippinesTime(new Date(), "end"),
                },
            },
            _sum: {
                package_ally_bounty_earnings: true,
            },
        }))._sum?.package_ally_bounty_earnings ?? 0;
        if (referralEarnings > 200 && !dailyTask?.two_hundred_referrals_amount) {
            await tx.alliance_wheel_table.update({
                where: {
                    alliance_wheel_id: dailyTask?.alliance_wheel_id,
                },
                data: {
                    two_hundred_referrals_amount: true,
                },
            });
            spinIncrements.push(4);
        }
        if (referralEarnings > 500 && !dailyTask?.five_hundred_referrals_amount) {
            await tx.alliance_wheel_table.update({
                where: {
                    alliance_wheel_id: dailyTask?.alliance_wheel_id,
                },
                data: {
                    five_hundred_referrals_amount: true,
                },
            });
            spinIncrements.push(10);
        }
        if (spinIncrements.length > 0) {
            const totalIncrement = spinIncrements.reduce((sum, increment) => sum + increment, 0);
            await tx.alliance_wheel_log_table.update({
                where: {
                    alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
                },
                data: {
                    alliance_wheel_spin_count: {
                        increment: totalIncrement,
                    },
                },
            });
        }
        const returnData = {
            wheelLog,
            dailyTask,
        };
        await redis.set(cacheKey, JSON.stringify(dailyTask));
        return returnData;
    });
};
export const wheelPutModel = async (params) => {
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
    const { alliance_olympus_wallet, alliance_olympus_earnings, alliance_referral_bounty, alliance_combined_earnings, alliance_winning_earnings, } = earningsData;
    const amount = quantity * 50;
    const combinedEarnings = Number(alliance_combined_earnings.toFixed(2));
    const requestedAmount = Number(amount.toFixed(2));
    if (combinedEarnings < requestedAmount) {
        throw new Error("Insufficient balance in the wallet.");
    }
    const { olympusWallet, olympusEarnings, referralWallet, winningEarnings, updatedCombinedWallet, } = deductFromWallets(requestedAmount, combinedEarnings, Number(alliance_olympus_wallet), Number(alliance_olympus_earnings), Number(alliance_referral_bounty), Number(alliance_winning_earnings));
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
        return {
            message: "Wheel updated successfully.",
        };
    });
    return response;
};
function deductFromWallets(amount, combinedWallet, olympusWallet, olympusEarnings, referralWallet, winningEarnings) {
    let remaining = amount;
    // Validate total funds
    if (combinedWallet < amount) {
        throw new Error("Insufficient balance in combined wallet.");
    }
    // Deduct from Olympus Wallet first
    if (olympusWallet >= remaining) {
        olympusWallet -= remaining;
        remaining = 0;
    }
    else {
        remaining -= olympusWallet;
        olympusWallet = 0;
    }
    // Deduct from Olympus Earnings next
    if (remaining > 0) {
        if (olympusEarnings >= remaining) {
            olympusEarnings -= remaining;
            remaining = 0;
        }
        else {
            remaining -= olympusEarnings;
            olympusEarnings = 0;
        }
    }
    // Deduct from Referral Wallet
    if (remaining > 0) {
        if (referralWallet >= remaining) {
            referralWallet -= remaining;
            remaining = 0;
        }
        else {
            remaining -= referralWallet;
            referralWallet = 0;
        }
    }
    if (remaining > 0) {
        if (winningEarnings >= remaining) {
            winningEarnings -= remaining;
            remaining = 0;
        }
        else {
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
