import { Hono } from "hono";
import { protectionGetMiddleware } from "../../middleware/protection.middleware.js";

import {
  adminController,
  loginController,
  loginGetController,
  registerUserCodeController,
  registerUserController,
} from "./auth.controller.js";
import {
  authGetMiddleware,
  authMiddleware,
  registerUserCodeMiddleware,
  registerUserMiddleware,
} from "./auth.middleware.js";

const auth = new Hono();

auth.get("/", authGetMiddleware, loginGetController);

auth.post("/", authMiddleware, loginController);

auth.post("/xeloraAccess", authMiddleware, adminController);

auth.get(
  "/register/:code",
  registerUserCodeMiddleware,
  registerUserCodeController
);

auth.post(
  "/register",
  protectionGetMiddleware,
  registerUserMiddleware,
  registerUserController
);

export default auth;
