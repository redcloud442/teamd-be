import type { Context, Next } from "hono";
import {
  authCodeSchema,
  loginCheckSchema,
  LoginSchema,
  registerUserCodeSchema,
  registerUserSchema,
} from "../../schema/schema.js";

import { getClientIP, sendErrorResponse } from "../../utils/function.js";
import { rateLimit } from "../../utils/redis.js";

export const authMiddleware = async (c: Context, next: Next) => {
  const { userName } = await c.req.json();

  const parsed = LoginSchema.safeParse({ userName });

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

export const authCodeGetMiddleware = async (c: Context, next: Next) => {
  const { searchParams } = new URL(c.req.url);

  const code = searchParams.get("code");

  const parsed = authCodeSchema.safeParse({ code });

  if (!parsed.success) {
    return c.json({ message: "Invalid code" }, 400);
  }

  const isAllowed = await rateLimit(`rate-limit:${code}`, 5, "10s", c);

  if (!isAllowed) {
    return sendErrorResponse(
      "Too many requests. Please try again later after 1 minute.",
      429
    );
  }

  c.set("code", code);

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

  const { userName, firstName, lastName, referalLink, url, botField, email } =
    await c.req.json();

  const parsed = registerUserSchema.safeParse({
    userName,
    firstName,
    userId: user?.id,
    lastName,
    referalLink,
    url,
    botField,
    email,
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

export const registerUserCodeMiddleware = async (c: Context, next: Next) => {
  const ip = getClientIP(c.req.raw);

  const { code } = c.req.param();

  const parsed = registerUserCodeSchema.safeParse({
    code,
  });

  if (!parsed.success) {
    return c.json({ message: "Invalid request" }, 400);
  }

  const isAllowed = await rateLimit(`rate-limit:${code}:${ip}`, 5, "1m", c);

  if (!isAllowed) {
    return sendErrorResponse(
      "Too many requests. Please try again later after 1 minute.",
      429
    );
  }

  c.set("params", parsed.data);

  await next();
};
