import { getPhilippinesTime } from "@/utils/function.js";
import prisma from "@/utils/prisma.js";
import type { alliance_member_table } from "@prisma/client";

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
  const random = Math.random();
  let cumulativeProbability = 0;

  for (const prize of prizes) {
    cumulativeProbability += prize.percentage;
    if (random <= cumulativeProbability) {
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

    if (wheel?.spin_count === 0) {
      throw new Error("You have no spins left");
    }

    if (!wheel) {
      await tx.alliance_wheel_table.create({
        data: {
          alliance_wheel_member_id: teamMemberProfile.alliance_member_id,
        },
      });
    }

    const winningPrize = getRandomPrize();

    console.log(winningPrize);

    if (winningPrize.label === "RE-SPIN") {
      await tx.alliance_wheel_table.update({
        where: { alliance_wheel_id: wheel!.alliance_wheel_id },
        data: { spin_count: (wheel!.spin_count ?? 0) + 1 },
      });
    } else if (winningPrize.label === "NO REWARD") {
      await tx.alliance_wheel_table.update({
        where: { alliance_wheel_id: wheel!.alliance_wheel_id },
        data: { spin_count: (wheel!.spin_count ?? 0) - 1 },
      });
    } else {
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
    }
    return { prize: winningPrize.label, count: wheel?.spin_count };
  });

  return response;
};
