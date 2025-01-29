import { Hono } from "hono";
import {
  referralDirectPostController,
  referralIndirectPostController,
  referralTotalGetController,
} from "./referral.controller.js";
import {
  referralDirectMiddleware,
  referralIndirectMiddleware,
  referralTotalGetMiddleware,
} from "./referral.middleware.js";

const referral = new Hono();

referral.get("/", referralTotalGetMiddleware, referralTotalGetController);

referral.post(
  "/direct",
  referralDirectMiddleware,
  referralDirectPostController
);

referral.post(
  "/indirect",
  referralIndirectMiddleware,
  referralIndirectPostController
);

export default referral;
