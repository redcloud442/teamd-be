import { makeError } from "./errors.js";
import { pinoLogger } from "./logger.js";
export async function errorHandlerMiddleware(err, c) {
    const { error, statusCode } = makeError(err);
    pinoLogger.error(error.message, error);
    return c.json(error, { status: statusCode });
}
