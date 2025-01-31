import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
import { supabaseClient } from "../../utils/supabase.js";
export const referralDirectModelPost = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort, teamMemberProfile, } = params;
    const inputData = {
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        columnAccessor: columnAccessor || "",
        isAscendingSort: isAscendingSort ? "true" : "false",
        teamMemberId: teamMemberProfile?.alliance_member_id || "",
        teamId: teamMemberProfile?.alliance_member_alliance_id || "",
    };
    const cacheKey = `referral-direct-${teamMemberProfile.alliance_member_id}-${page}-${limit}-${search}-${columnAccessor}-${isAscendingSort}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const { data, error } = await supabaseClient.rpc("get_ally_bounty", {
        input_data: inputData,
    });
    if (error)
        throw error;
    await redis.set(cacheKey, data, { ex: 300 });
    return data;
};
export const referralIndirectModelPost = async (params) => {
    const { page, limit, search, columnAccessor, isAscendingSort, teamMemberProfile, } = params;
    const inputData = {
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        columnAccessor: columnAccessor || "",
        isAscendingSort: isAscendingSort ? "true" : "false",
        teamMemberId: teamMemberProfile?.alliance_member_id || "",
        teamId: teamMemberProfile?.alliance_member_alliance_id || "",
    };
    const cacheKey = `referral-indirect-${teamMemberProfile.alliance_member_id}-${page}-${limit}-${search}-${columnAccessor}-${isAscendingSort}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const { data, error } = await supabaseClient.rpc("get_legion_bounty", {
        input_data: inputData,
    });
    if (error)
        throw error;
    await redis.set(cacheKey, data, { ex: 300 });
    return data;
};
export const referralTotalGetModel = async (params) => {
    const { teamMemberProfile } = params;
    return await prisma.$transaction(async (tx) => {
        const directReferrals = await tx.alliance_referral_table.findMany({
            where: {
                alliance_referral_from_member_id: teamMemberProfile.alliance_member_id,
            },
            select: { alliance_referral_member_id: true },
        });
        const directReferralIds = directReferrals.map((ref) => ref.alliance_referral_member_id);
        const indirectReferralIds = await tx.alliance_referral_table.findMany({
            where: {
                alliance_referral_from_member_id: { in: directReferralIds },
            },
            select: { alliance_referral_member_id: true },
        });
        const indirectReferralsSet = new Set(indirectReferralIds.map((ref) => ref.alliance_referral_member_id));
        directReferralIds.forEach((id) => indirectReferralsSet.delete(id));
        const indirectReferralArray = Array.from(indirectReferralsSet);
        const [directBounty, indirectBounty] = await Promise.all([
            directReferralIds.length > 0
                ? tx.package_ally_bounty_log.aggregate({
                    where: { package_ally_bounty_member_id: { in: directReferralIds } },
                    _sum: { package_ally_bounty_earnings: true },
                })
                : { _sum: { package_ally_bounty_earnings: 0 } },
            indirectReferralArray.length > 0
                ? tx.package_ally_bounty_log.aggregate({
                    where: {
                        package_ally_bounty_member_id: { in: indirectReferralArray },
                    },
                    _sum: { package_ally_bounty_earnings: true },
                })
                : { _sum: { package_ally_bounty_earnings: 0 } },
        ]);
        return {
            data: (directBounty._sum.package_ally_bounty_earnings || 0) +
                (indirectBounty._sum.package_ally_bounty_earnings || 0),
        };
    });
};
