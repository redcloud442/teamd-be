import { generateUniqueReferralCode } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
import { supabaseClient } from "../../utils/supabase.js";
export const loginModel = async (params) => {
    const { userName, ip } = params;
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
            company_member_table: {
                some: {
                    company_member_role: {
                        not: "ADMIN",
                    },
                },
            },
        },
        include: {
            company_member_table: true,
        },
    });
    if (!user) {
        throw new Error("Invalid username or password.");
    }
    const teamMemberProfile = user.company_member_table[0];
    if (!teamMemberProfile)
        throw new Error("User profile not found or incomplete.");
    if (teamMemberProfile.company_member_restricted) {
        throw new Error("User is banned.");
    }
    if (teamMemberProfile.company_member_restricted ||
        !teamMemberProfile.company_member_company_id) {
        throw new Error("Access restricted or incomplete profile.");
    }
    await prisma.$transaction([
        prisma.user_history_log.create({
            data: {
                user_ip_address: ip,
                user_history_user_id: user.user_id,
            },
        }),
    ]);
    const redirects = {
        MEMBER: "/",
    };
    const redirect = redirects[teamMemberProfile.company_member_role] || "/";
    return redirect;
};
export const loginGetModel = async (userName) => {
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
        },
        select: {
            user_id: true,
        },
    });
    const teamMember = await prisma.company_member_table.findFirst({
        where: {
            company_member_user_id: user?.user_id,
        },
        select: {
            company_member_role: true,
            company_member_restricted: true,
        },
    });
    if (teamMember?.company_member_restricted) {
        throw new Error("Not Allowed");
    }
    return user;
};
export const adminModel = async (params) => {
    const { userName } = params;
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
            company_member_table: {
                some: {
                    company_member_role: "ADMIN",
                },
            },
        },
        include: {
            company_member_table: true,
        },
    });
    if (!user) {
        throw new Error("User not found");
    }
    if (!user) {
        throw new Error("User is not an admin");
    }
    const teamMember = user.company_member_table[0];
    if (!teamMember) {
        throw new Error("User is not an admin");
    }
    return { success: true };
};
export const registerUserModel = async (params) => {
    const { userId, userName, firstName, lastName, referalLink, url, ip, botField, phoneNumber, gender, } = params;
    if (referalLink) {
        const DEFAULT_COMPANY_ID = "a1b9ceb9-cb09-4c09-832d-6e5a017d048b";
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user_table.create({
                data: {
                    user_id: userId,
                    user_email: userName + "@gmail.com",
                    user_first_name: firstName,
                    user_last_name: lastName,
                    user_username: userName,
                    user_bot_field: botField === "true" ? true : false,
                    user_phone_number: phoneNumber,
                    user_gender: gender,
                },
            });
            if (!user) {
                throw new Error("Failed to create user");
            }
            const allianceMember = await tx.company_member_table.create({
                data: {
                    company_member_company_id: DEFAULT_COMPANY_ID,
                    company_member_user_id: userId,
                },
                select: {
                    company_member_id: true,
                },
            });
            const referralCode = await generateUniqueReferralCode(tx);
            const referralLinkURL = `http://localhost:3000/register/${referralCode}`;
            await tx.company_referral_link_table.create({
                data: {
                    company_referral_link: referralLinkURL,
                    company_referral_link_member_id: allianceMember.company_member_id,
                    company_referral_code: referralCode,
                },
            });
            await tx.company_earnings_table.create({
                data: {
                    company_earnings_member_id: allianceMember.company_member_id,
                },
            });
            await handleReferral(tx, referalLink, allianceMember.company_member_id);
            await supabaseClient.auth.admin.updateUserById(userId, {
                user_metadata: {
                    Role: "MEMBER",
                    ReferralCode: referralCode,
                    ReferralLink: referralLinkURL,
                    CompanyId: DEFAULT_COMPANY_ID,
                    UserName: userName,
                    CompanyMemberId: allianceMember.company_member_id,
                },
            });
            return {
                success: true,
                user,
            };
        });
    }
    await prisma.user_history_log.create({
        data: {
            user_ip_address: ip || "127.0.0.1",
            user_history_user_id: userId,
        },
    });
};
export const registerUserCodeModel = async (params) => {
    const { code } = params;
    const user = await prisma.user_table.findFirst({
        where: {
            company_member_table: {
                some: {
                    company_referral_link_table: {
                        some: {
                            company_referral_code: code,
                        },
                    },
                    AND: [
                        {
                            company_member_is_active: true,
                        },
                    ],
                },
            },
        },
        select: {
            user_username: true,
        },
    });
    return user;
};
async function handleReferral(tx, referalLink, allianceMemberId) {
    const referrerData = await tx.$queryRaw `
    SELECT
        rl.company_referral_link_id,
        rt.company_referral_hierarchy,
        am.company_member_id
      FROM company_schema.company_referral_link_table rl
      LEFT JOIN company_schema.company_referral_table rt
        ON rl.company_referral_link_member_id = rt.company_referral_member_id
      LEFT JOIN company_schema.company_member_table am
        ON am.company_member_id = rl.company_referral_link_member_id
      LEFT JOIN user_schema.user_table ut
        ON ut.user_id = am.company_member_user_id
      WHERE rl.company_referral_code = ${referalLink}
  `;
    const referrerLinkId = referrerData[0].company_referral_link_id;
    const parentHierarchy = referrerData[0].company_referral_hierarchy;
    const referrerMemberId = referrerData[0].company_member_id;
    const newReferral = await tx.company_referral_table.create({
        data: {
            company_referral_member_id: allianceMemberId,
            company_referral_link_id: referrerLinkId,
            company_referral_hierarchy: "",
            company_referral_from_member_id: referrerMemberId,
        },
        select: {
            company_referral_id: true,
        },
    });
    const newHierarchy = parentHierarchy
        ? `${parentHierarchy}.${allianceMemberId}`
        : `${referrerMemberId}.${allianceMemberId}`;
    await tx.company_referral_table.update({
        where: {
            company_referral_id: newReferral.company_referral_id,
        },
        data: {
            company_referral_hierarchy: newHierarchy,
        },
    });
}
