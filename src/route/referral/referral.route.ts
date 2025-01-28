import { Hono } from "hono";
import {
  referralDirectPostController,
  referralIndirectPostController,
} from "./referral.controller.js";
import {
  referralDirectMiddleware,
  referralIndirectMiddleware,
} from "./referral.middleware.js";

const referral = new Hono();

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
