import type { Context } from "hono";
import { getClientIP } from "../../utils/function.js";
import { supabaseAnonClient } from "../../utils/supabase.js";
import {
  adminModel,
  loginGetModel,
  loginModel,
  registerUserModel,
} from "./auth.model.js";

export const loginController = async (c: Context) => {
  try {
    const ip = getClientIP(c.req.raw);

    const { userName, password } = await c.req.json();

    await loginModel(userName, password, ip);

    return c.json({ message: "Login successful" }, 200);
  } catch (error) {
    return c.json({ message: "Error" }, 500);
  }
};

export const loginGetController = async (c: Context) => {
  try {
    const { searchParams } = new URL(c.req.url);

    const userName = searchParams.get("userName");
    if (!userName) {
      return c.json({ message: "userName query parameter is required" }, 400);
    }

    const user = await loginGetModel(userName);

    if (user) {
      return c.json({ message: "User exists" }, 400);
    }

    return c.json({ message: "User does not exist" }, 200);
  } catch (error) {
    return c.json({ message: "Error occurred" }, 500);
  }
};

export const adminController = async (c: Context) => {
  try {
    const ip = getClientIP(c.req.raw);

    const { userName, password } = await c.req.json();

    await adminModel(userName, password, ip);

    return c.json({ message: "Admin login successful" }, 200);
  } catch (error) {
    return c.json({ message: "Error occurred" }, 500);
  }
};

export const registerUserController = async (c: Context) => {
  try {
    const supabaseClient = supabaseAnonClient;
    const {
      userId,
      userName,
      password,
      firstName,
      lastName,
      referalLink,
      url,
    } = await c.req.json();

    await registerUserModel(supabaseClient, {
      userId,
      userName,
      password,
      firstName,
      lastName,
      referalLink,
      url,
    });

    return c.json({ message: "User created" }, 200);
  } catch (error) {
    console.log(error);
    return c.json({ message: "Error occurred" }, 500);
  }
};
