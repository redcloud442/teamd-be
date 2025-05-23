import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import { protectionMiddleware } from "./middleware/protection.middleware.js";
import route from "./route/route.js";
import { globalRateLimit, redis, redisSubscriber } from "./utils/redis.js";
const app = new Hono();
const { upgradeWebSocket, websocket } = createBunWebSocket();
// Apply CORS first, then middleware
app.use("*", cors({
    origin: (origin) => {
        const allowedOrigins = [
            "http://localhost:3001",
            "https://your-production-domain.com",
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
}), globalRateLimit(), supabaseMiddleware());
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
const clients = new Map();
const connectedSockets = new Set();
async function listenForRedisMessages() {
    try {
        await redisSubscriber.subscribe("deposit");
        console.log("✅ Redis subscribed to deposit");
        redisSubscriber.on("message", async (channel, message) => {
            if (channel === "deposit") {
                for (const userSockets of clients.values()) {
                    for (const ws of userSockets) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ event: "deposit", data: message }));
                        }
                    }
                }
            }
        });
    }
    catch (err) {
        console.error("❌ Error subscribing to Redis:", err);
    }
}
setInterval(() => {
    for (const ws of connectedSockets) {
        if (ws.readyState !== WebSocket.OPEN) {
            connectedSockets.delete(ws);
        }
    }
}, 30_000);
app.get("/ws", protectionMiddleware, 
//@ts-ignore
upgradeWebSocket((c) => {
    return {
        async onOpen(_event, ws) {
            const { id } = c.get("user");
            // Track by user
            if (!clients.has(id)) {
                clients.set(id, new Set([ws]));
            }
            else {
                clients.get(id).add(ws);
            }
            // Also track flat socket for global broadcast
            connectedSockets.add(ws);
            await redis.sadd("websocket-clients", id);
            console.log(`Client ${id} connected.`);
        },
        onClose(ws) {
            connectedSockets.delete(ws);
            if (ws.id) {
                const userSockets = clients.get(ws.id);
                if (userSockets) {
                    userSockets.delete(ws);
                    if (userSockets.size === 0) {
                        redis.srem("websocket-clients", ws.id);
                        clients.delete(ws.id);
                    }
                }
            }
        },
    };
}));
listenForRedisMessages();
app.onError(errorHandlerMiddleware);
// Ensure the server starts correctly in Bun
export default {
    port: envConfig.PORT || 9000,
    fetch: app.fetch,
    websocket: websocket,
};
