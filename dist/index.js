import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import route from "./route/route.js";
const app = new Hono();
app.use("*", cors({
    origin: (origin) => {
        const allowedOrigins = [
            "http://localhost:3001",
            "https://www.digi-wealth.vip",
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            return origin;
        }
        else {
            return null;
        }
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
}), 
// globalRateLimit(),
supabaseMiddleware());
//
// const { upgradeWebSocket, websocket } = createBunWebSocket<ServerWebSocket>();
// Apply CORS first, then middleware
app.use(logger()); // Logger should be before error handling
app.get("/", (c) => {
    return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>API Status</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
          }
          .status {
            font-size: 20px;
            color: green;
          }
        </style>
    </head>
    <body>
        <h1>API Status</h1>
        <p class="status">✅ API is working perfectly!</p>
        <p>Current Time: ${new Date().toLocaleString()}</p>
    </body>
    </html>
  `);
});
app.route("/api/v1", route);
app.onError(errorHandlerMiddleware);
export default {
    port: envConfig.PORT || 9000,
    fetch: app.fetch,
};
