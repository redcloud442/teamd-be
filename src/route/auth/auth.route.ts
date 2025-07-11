import { Hono } from "hono";
import { protectionMiddleware } from "../../middleware/protection.middleware.js";

import {
  adminController,
  authCodeGetController,
  loginController,
  loginGetController,
  registerUserCodeController,
  registerUserController,
} from "./auth.controller.js";
import {
  authCodeGetMiddleware,
  authGetMiddleware,
  authMiddleware,
  registerUserCodeMiddleware,
  registerUserMiddleware,
} from "./auth.middleware.js";

const auth = new Hono();

auth.get(
  "/register/:code",
  registerUserCodeMiddleware,
  registerUserCodeController
);

auth.get("/", authGetMiddleware, loginGetController);

auth.get("/code", authCodeGetMiddleware, authCodeGetController);

auth.post("/", authMiddleware, loginController);

auth.post("/digiAuth", authMiddleware, adminController);

auth.post(
  "/register",
  protectionMiddleware,
  registerUserMiddleware,
  registerUserController
);

export default auth;
