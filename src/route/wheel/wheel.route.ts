import { Hono } from "hono";
import { wheelPostController } from "./wheel.controller.js";
import { wheelPostMiddleware } from "./wheel.middleware.js";

const wheel = new Hono();

wheel.post("/", wheelPostMiddleware, wheelPostController);

export default wheel;
