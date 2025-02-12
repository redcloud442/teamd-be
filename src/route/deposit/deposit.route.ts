import { Hono } from "hono";
import {
  depositHistoryPostController,
  depositListPostController,
  depositPostController,
  depositPutController,
  depositReferencePostController,
  depositReportPostController,
} from "./deposit.controller.js";
import {
  depositHistoryPostMiddleware,
  depositListPostMiddleware,
  depositMiddleware,
  depositPutMiddleware,
  depositReferenceMiddleware,
  depositReportPostMiddleware,
} from "./deposit.middleware.js";

const deposit = new Hono();

deposit.post("/", depositMiddleware, depositPostController);

deposit.post(
  "/reference",
  depositReferenceMiddleware,
  depositReferencePostController
);

deposit.post(
  "/history",
  depositHistoryPostMiddleware,
  depositHistoryPostController
);

deposit.post(
  "/report",
  depositReportPostMiddleware,
  depositReportPostController
);

deposit.put("/:id", depositPutMiddleware, depositPutController);

deposit.post("/list", depositListPostMiddleware, depositListPostController);

export default deposit;
