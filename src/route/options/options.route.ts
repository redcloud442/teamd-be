import { Hono } from "hono";
import {
  merchantOptionsPostController,
  userOptionsPostController,
} from "./options.controller.js";
import { userOptionsPostMiddleware } from "./options.middleware.js";

const options = new Hono();

options.post(
  "/user-options",
  userOptionsPostMiddleware,
  userOptionsPostController
);

options.post(
  "/merchant-options",
  userOptionsPostMiddleware,
  merchantOptionsPostController
);

export default options;
