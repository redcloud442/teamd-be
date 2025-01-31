import { envConfig } from "@/env.js";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { Server as SocketIOServer } from "socket.io";

const app = new Hono();

const httpServer = serve({
  fetch: app.fetch,
  port: envConfig.PORT,
});

// Initialize the Socket.io instance
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "https://primepinas.com"],
    credentials: true,
  },
});

export { app, httpServer, io };
