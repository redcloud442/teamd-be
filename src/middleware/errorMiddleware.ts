import type { Context } from "hono";
import { makeError } from "../utils/errors.js";
import { pinoLogger } from "../utils/logger.js";

export async function errorHandlerMiddleware(err: Error, c: Context) {
  const { error, statusCode } = makeError(err);
  pinoLogger.error(error.message, error);
  return c.json(error, { status: statusCode as any });
}

//test
