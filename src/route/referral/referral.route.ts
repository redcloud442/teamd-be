import { Hono } from "hono";
import {
  newReferralPostController,
  referralDirectPostController,
  referralIndirectPostController,
  referralTotalGetController,
} from "./referral.controller.js";
import {
  referralDirectMiddleware,
  referralIndirectMiddleware,
  referralNewRegisterMiddleware,
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

referral.post(
  "/new-register",
  referralNewRegisterMiddleware,
  newReferralPostController
);

export default referral;
