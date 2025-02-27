import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { envConfig } from "./env.js";
import { supabaseMiddleware } from "./middleware/auth.middleware.js";
import { errorHandlerMiddleware } from "./middleware/errorMiddleware.js";
import route from "./route/route.js";

const app = new Hono();

// Apply CORS first, then middleware
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "https://primepinas.com"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    exposeHeaders: ["Content-Range", "X-Total-Count"],
  }),
  supabaseMiddleware()
);

app.use(logger()); // Logger should be before error handling

app.get("/", (c) => {
  return c.text("API endpoint is working!");
});

app.route("/api/v1", route);

app.onError(errorHandlerMiddleware);

// Ensure the server starts correctly in Bun
export default {
  port: envConfig.PORT || 9000, // Use 9000 if env variable is missing
  fetch: app.fetch, // Bun automatically calls this
};

console.log(
  `🚀 Server is running on http://localhost:${envConfig.PORT || 9000}`
);
