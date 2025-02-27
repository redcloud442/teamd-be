import { Hono } from "hono";
import {
  wheelGetController,
  wheelPostController,
  wheelPutController,
  wheelPutSettingsController,
} from "./wheel.controller.js";
import {
  wheelGetMiddleware,
  wheelPostMiddleware,
  wheelPutMiddleware,
  wheelPutSettingsMiddleware,
} from "./wheel.middleware.js";

const wheel = new Hono();

wheel.post("/", wheelPostMiddleware, wheelPostController);

wheel.get("/", wheelGetMiddleware, wheelGetController);

wheel.put("/", wheelPutMiddleware, wheelPutController);

wheel.put(
  "/:id/settings",
  wheelPutSettingsMiddleware,
  wheelPutSettingsController
);

export default wheel;
