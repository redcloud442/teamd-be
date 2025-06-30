import { Prisma } from "@prisma/client";
import type { Context } from "hono";
import { getClientIP } from "../../utils/function.js";
import { supabaseClient } from "../../utils/supabase.js";
import {
  adminModel,
  authCodeGetModel,
  loginGetModel,
  loginModel,
  registerUserCodeModel,
  registerUserModel,
} from "./auth.model.js";

export const loginController = async (c: Context) => {
  try {
    const ip = getClientIP(c.req.raw);

    const params = c.get("params");

    await loginModel({ ...params, ip });

    return c.json({ message: "Login successful" }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return c.json({ message: "A database error occurred" }, 500);
    }

    if (error instanceof Error) {
      return c.json({ message: error.message }, 401);
    }
    return c.json({ message: "Internal server error" }, 500);
  }
};

export const loginGetController = async (c: Context) => {
  try {
    const userName = c.get("userName");
    if (!userName) {
      return c.json({ message: "userName query parameter is required" }, 400);
    }

    const user = await loginGetModel(userName);

    if (user) {
      return c.json({ message: "User exists" }, 400);
    }

    return c.json({ message: "User does not exist" }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return c.json({ message: "A database error occurred" }, 500);
    }
    if (error instanceof Error) {
      return c.json({ message: error.message }, 401);
    }

    // Handles any unknown errors
    return c.json({ message: "Internal server error" }, 500);
  }
};

export const authCodeGetController = async (c: Context) => {
  try {
    const code = c.get("code");
    if (!code) {
      return c.json({ message: "code query parameter is required" }, 400);
    }

    const data = await authCodeGetModel(code);

    if (data) {
      return c.json(
        { message: "Code exists", referralLink: data.referralLink },
        200
      );
    }

    return c.json({ message: "Code does not exist" }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return c.json({ message: "A database error occurred" }, 500);
    }
    if (error instanceof Error) {
      return c.json({ message: error.message }, 401);
    }

    // Handles any unknown errors
    return c.json({ message: "Internal server error" }, 500);
  }
};

export const adminController = async (c: Context) => {
  try {
    const params = c.get("params");

    await adminModel(params);

    return c.json({ message: "Admin login successful" }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return c.json({ message: "A database error occurred" }, 500);
    }
    if (error instanceof Error) {
      return c.json({ message: error.message }, 401);
    }

    // Handles any unknown errors
    return c.json({ message: "Internal server error" }, 500);
  }
};

export const registerUserController = async (c: Context) => {
  const params = c.get("params");
  try {
    const ip = getClientIP(c.req.raw);

    await registerUserModel({ ...params, ip });

    return c.json({ message: "User created" }, 200);
  } catch (error) {
    await supabaseClient.auth.admin.deleteUser(params.userId);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return c.json({ message: "A database error occurred" }, 500);
    }
    if (error instanceof Error) {
      return c.json({ message: error.message }, 401);
    }
    return c.json({ message: "Internal server error" }, 500);
  }
};

export const registerUserCodeController = async (c: Context) => {
  const params = c.get("params");
  try {
    const data = await registerUserCodeModel(params);

    return c.json({ data }, 200);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return c.json({ message: "A database error occurred" }, 500);
    }
    if (error instanceof Error) {
      return c.json({ message: error.message }, 401);
    }

    return c.json({ message: "Internal server error" }, 500);
  }
};
