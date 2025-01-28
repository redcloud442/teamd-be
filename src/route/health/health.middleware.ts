import type { Next } from "hono";

import type { Context } from "hono";

export const healthMiddleware = async (c: Context, next: Next) => {
  return await next();
};
