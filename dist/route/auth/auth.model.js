import bcryptjs from "bcryptjs";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
export const loginModel = async (userName, password, ip) => {
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: {
                equals: userName,
                mode: "insensitive",
            },
            alliance_member_table: {
                some: {
                    alliance_member_role: {
                        not: "ADMIN",
                    },
                },
            },
        },
        include: {
            alliance_member_table: true,
        },
    });
    if (!user) {
        return sendErrorResponse("Invalid username or password", 401);
    }
    const teamMemberProfile = user.alliance_member_table[0];
    if (!teamMemberProfile)
        return sendErrorResponse("User profile not found or incomplete.", 403);
    if (teamMemberProfile.alliance_member_restricted) {
        return sendErrorResponse("User is banned.", 403);
    }
    if (teamMemberProfile.alliance_member_role === "ADMIN") {
        return sendErrorResponse("Invalid Request", 401);
    }
    const comparePassword = await bcryptjs.compare(password, user.user_password);
    if (!comparePassword) {
        return sendErrorResponse("Password Incorrect", 401);
    }
    if (teamMemberProfile.alliance_member_restricted ||
        !teamMemberProfile.alliance_member_alliance_id) {
        return sendErrorResponse("Access restricted or incomplete profile.", 403);
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
    const redirect = redirects[teamMemberProfile.alliance_member_role] || "/";
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
    const teamMember = await prisma.alliance_member_table.findFirst({
        where: {
            alliance_member_user_id: user?.user_id,
        },
        select: {
            alliance_member_role: true,
            alliance_member_restricted: true,
        },
    });
    if (teamMember?.alliance_member_restricted) {
        return sendErrorResponse("Not Allowed", 403);
    }
    return user;
};
export const adminModel = async (userName, password, ip) => {
    const user = await prisma.user_table.findFirst({
        where: {
            user_username: userName,
        },
        select: {
            user_id: true,
            user_password: true,
        },
    });
    if (!user) {
        return sendErrorResponse("User not found", 404);
    }
    const comparePassword = await bcryptjs.compare(password, user.user_password);
    if (!comparePassword) {
        return sendErrorResponse("Password incorrect", 401);
    }
    const teamMember = await prisma.alliance_member_table.findFirst({
        where: {
            alliance_member_user_id: user.user_id,
            alliance_member_role: "ADMIN",
        },
    });
    if (!teamMember) {
        return sendErrorResponse("User is not an admin", 403);
    }
    return { success: true, user };
};
export const registerUserModel = async (supabaseClient, params) => {
    const { userId, userName, password, firstName, lastName, referalLink, url } = params;
    const parameters = {
        userId,
        userName,
        password,
        firstName,
        lastName,
        referalLink,
        url,
        email: `${userName}@gmail.com`,
    };
    const { error } = await supabaseClient.rpc("create_user_trigger", {
        input_data: parameters,
    });
    if (error)
        throw error;
};
