import { Hono } from "hono";
import {
  depositHistoryPostController,
  depositListPostController,
  depositPostController,
  depositPutController,
  depositReferencePostController,
  depositReportPostController,
  depositUserGetController,
} from "./deposit.controller.js";
import {
  depositHistoryPostMiddleware,
  depositListPostMiddleware,
  depositMiddleware,
  depositPutMiddleware,
  depositReferenceMiddleware,
  depositReportPostMiddleware,
  depositUserGetMiddleware,
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

deposit.get("/user", depositUserGetMiddleware, depositUserGetController);

deposit.post(
  "/report",
  depositReportPostMiddleware,
  depositReportPostController
);

deposit.put("/:id", depositPutMiddleware, depositPutController);

deposit.post("/list", depositListPostMiddleware, depositListPostController);

export default deposit;
