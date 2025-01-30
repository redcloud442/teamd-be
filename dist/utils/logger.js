import pino from "pino";
const pinoConfig = pino.pino({
    timestamp: pino.stdTimeFunctions.isoTime,
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: false,
        },
    },
});
function formatLogMessage(message, data) {
    const logMessage = data
        ? `${message} ${JSON.stringify(data, null, 2)}`
        : message;
    return logMessage;
}
export const pinoLogger = {
    info: (message, data) => pinoConfig.info(formatLogMessage(message, data)),
    error: (message, data) => pinoConfig.error(formatLogMessage(message, data)),
    debug: (message, data) => pinoConfig.debug(formatLogMessage(message, data)),
    warn: (message, data) => pinoConfig.warn(formatLogMessage(message, data)),
};
