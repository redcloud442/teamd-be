import { Hono } from "hono";
import { wheelGetController, wheelPostController, wheelPutController, } from "./wheel.controller.js";
import { wheelGetMiddleware, wheelPostMiddleware, wheelPutMiddleware, } from "./wheel.middleware.js";
const wheel = new Hono();
wheel.post("/", wheelPostMiddleware, wheelPostController);
wheel.get("/", wheelGetMiddleware, wheelGetController);
wheel.put("/", wheelPutMiddleware, wheelPutController);
export default wheel;
