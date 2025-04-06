import bcrypt from "bcryptjs";
import prisma from "../../utils/prisma.js";
export const loginModel = async (params) => {
    const { userName, password, ip } = params;
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
        throw new Error("Invalid username");
    }
    const teamMemberProfile = user.company_member_table[0];
    if (!teamMemberProfile)
        throw new Error("User profile not found or incomplete.");
    if (teamMemberProfile.company_member_restricted) {
        throw new Error("User is banned.");
    }
    const comparePassword = await bcrypt.compare(password, user.user_password);
    if (!comparePassword) {
        throw new Error("Password Incorrect");
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
    const { userName, password } = params;
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
    const comparePassword = await bcrypt.compare(password, user.user_password);
    if (!comparePassword) {
        throw new Error("Password incorrect");
    }
    if (!teamMember) {
        throw new Error("User is not an admin");
    }
    return { success: true };
};
export const registerUserModel = async (params) => {
    const { userId, userName, password, firstName, lastName, referalLink, url, ip, botField, } = params;
    if (referalLink) {
        const DEFAULT_ALLIANCE_ID = "35f77cd9-636a-41fa-a346-9cb711e7a338";
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user_table.create({
                data: {
                    user_id: userId,
                    user_email: `${userName}@gmail.com`,
                    user_password: password,
                    user_first_name: firstName,
                    user_last_name: lastName,
                    user_username: userName,
                    user_bot_field: botField,
                },
            });
            if (!user) {
                throw new Error("Failed to create user");
            }
            const allianceMember = await tx.company_member_table.create({
                data: {
                    company_member_role: "MEMBER",
                    company_member_company_id: DEFAULT_ALLIANCE_ID,
                    company_member_user_id: userId,
                },
                select: {
                    company_member_id: true,
                },
            });
            const referralLinkURL = `${url}?referralLink=${encodeURIComponent(userName)}`;
            await tx.company_referral_link_table.create({
                data: {
                    company_referral_link: referralLinkURL,
                    company_referral_link_member_id: allianceMember.company_member_id,
                },
            });
            await tx.company_earnings_table.create({
                data: {
                    company_earnings_member_id: allianceMember.company_member_id,
                },
            });
            await handleReferral(tx, referalLink, allianceMember.company_member_id);
            return {
                success: true,
                user,
            };
        });
    }
    await prisma.user_history_log.create({
        data: {
            user_ip_address: ip,
            user_history_user_id: userId,
        },
    });
};
async function handleReferral(tx, referalLink, allianceMemberId) {
    const referrerData = await tx.$queryRaw `
    SELECT
        rl.company_referral_link_id,
        rt.company_referral_hierarchy,
        am.company_member_id
      FROM alliance_schema.company_referral_link_table rl
      LEFT JOIN alliance_schema.company_referral_table rt
        ON rl.company_referral_link_member_id = rt.company_referral_member_id
      LEFT JOIN alliance_schema.company_member_table am
        ON am.company_member_id = rl.company_referral_link_member_id
      LEFT JOIN user_schema.user_table ut
        ON ut.user_id = am.company_member_user_id
      WHERE ut.user_username = ${referalLink}
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
