import { Hono } from "hono";
import {
  depositHistoryPostController,
  depositPostController,
  depositPutController,
} from "./deposit.controller.js";
import {
  depositHistoryPostMiddleware,
  depositMiddleware,
  depositPutMiddleware,
} from "./deposit.middleware.js";

const deposit = new Hono();

deposit.post("/", depositMiddleware, depositPostController);

deposit.post(
  "/history",
  depositHistoryPostMiddleware,
  depositHistoryPostController
);

deposit.put("/:id", depositPutMiddleware, depositPutController);

export default deposit;
