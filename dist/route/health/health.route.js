import { Hono } from "hono";
import { healthMiddleware } from "./health.middleware.js";
const health = new Hono();
health.get("/", healthMiddleware, (c) => c.json({ message: "OK" }, { status: 200 }));
export default health;
