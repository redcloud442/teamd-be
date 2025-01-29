import type { SupabaseClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";

export const loginModel = async (params: {
  userName: string;
  password: string;
  ip: string;
}) => {
  const { userName, password, ip } = params;
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
    throw new Error("Invalid username or password");
  }

  const teamMemberProfile = user.alliance_member_table[0];

  if (!teamMemberProfile)
    throw new Error("User profile not found or incomplete.");

  if (teamMemberProfile.alliance_member_restricted) {
    throw new Error("User is banned.");
  }

  const comparePassword = await bcrypt.compare(password, user.user_password);

  if (!comparePassword) {
    throw new Error("Password Incorrect");
  }

  if (
    teamMemberProfile.alliance_member_restricted ||
    !teamMemberProfile.alliance_member_alliance_id
  ) {
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

  const redirects: Record<string, string> = {
    MEMBER: "/",
  };

  const redirect = redirects[teamMemberProfile.alliance_member_role] || "/";

  return redirect;
};

export const loginGetModel = async (userName: string) => {
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

export const adminModel = async (
  userName: string,
  password: string,
  ip: string
) => {
  const user = await prisma.user_table.findFirst({
    where: {
      user_username: {
        equals: userName,
        mode: "insensitive",
      },
      alliance_member_table: {
        some: {
          alliance_member_role: "ADMIN",
        },
      },
    },
    include: {
      alliance_member_table: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (!user) {
    throw new Error("User is not an admin");
  }

  const teamMember = user.alliance_member_table[0];

  const comparePassword = await bcrypt.compare(password, user.user_password);

  if (!comparePassword) {
    throw new Error("Password incorrect");
  }

  if (!teamMember) {
    throw new Error("User is not an admin");
  }

  return { success: true };
};

export const registerUserModel = async (
  supabaseClient: SupabaseClient,
  params: {
    userId: string;
    userName: string;
    password: string;
    firstName: string;
    lastName: string;
    referalLink: string;
    url: string;
  }
) => {
  const { userId, userName, password, firstName, lastName, referalLink, url } =
    params;

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

  if (error) throw error;
};
