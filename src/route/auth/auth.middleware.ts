import type { Context, Next } from "hono";
import {
  loginCheckSchema,
  LoginSchema,
  registerUserSchema,
} from "../../schema/schema.js";

import { getClientIP, sendErrorResponse } from "../../utils/function.js";
import { rateLimit } from "../../utils/redis.js";

export const authMiddleware = async (c: Context, next: Next) => {
  const { userName, password } = await c.req.json();

  const parsed = LoginSchema.safeParse({ userName, password });

  if (!parsed.success) {
    return c.json({ message: "Invalid userName or password" }, 400);
  }

  const isAllowed = await rateLimit(`rate-limit:${userName}`, 5, "1m", c);

  if (!isAllowed) {
    return sendErrorResponse(
      "Too many requests. Please try again later after 1 minute.",
      429
    );
  }

  c.set("params", parsed.data);

  await next();
};

export const authGetMiddleware = async (c: Context, next: Next) => {
  const { searchParams } = new URL(c.req.url);

  const userName = searchParams.get("userName");

  const parsed = loginCheckSchema.safeParse({ userName });

  if (!parsed.success) {
    return c.json({ message: "Invalid userName" }, 400);
  }

  const isAllowed = await rateLimit(`rate-limit:${userName}`, 5, "1m", c);

  if (!isAllowed) {
    return sendErrorResponse(
      "Too many requests. Please try again later after 1 minute.",
      429
    );
  }

  c.set("userName", userName);

  await next();
};

export const loginCheckMiddleware = async (c: Context, next: Next) => {
  const { searchParams } = new URL(c.req.url);

  const userName = JSON.parse(searchParams.get("userName") as string);

  const parsed = loginCheckSchema.safeParse({ userName });

  if (!parsed.success) {
    return c.json({ message: "Invalid userName" }, 400);
  }

  const isAllowed = await rateLimit(`rate-limit:${userName}`, 5, "1m", c);

  if (!isAllowed) {
    return sendErrorResponse(
      "Too many requests. Please try again later after 1 minute.",
      429
    );
  }

  c.set("userName", userName);

  await next();
};

export const registerUserMiddleware = async (c: Context, next: Next) => {
  const user = c.get("user");
  const ip = getClientIP(c.req.raw);

  const {
    userName,
    firstName,
    lastName,
    referalLink,
    url,
    botField,
    email,
    phoneNumber,
  } = await c.req.json();

  const parsed = registerUserSchema.safeParse({
    userName,
    firstName,
    userId: user?.id,
    lastName,
    referalLink,
    url,
    botField,
    email,
    phoneNumber,
  });

  if (!parsed.success) {
    return c.json({ message: "Invalid request" }, 400);
  }

  const isAllowed = await rateLimit(`rate-limit:${userName}:${ip}`, 5, "1m", c);

  if (!isAllowed) {
    return sendErrorResponse(
      "Too many requests. Please try again later after 1 minute.",
      429
    );
  }

  c.set("params", parsed.data);

  await next();
};
