import { Hono } from "hono";
import {
  adminController,
  loginController,
  loginGetController,
  registerUserController,
} from "./auth.controller.js";
import {
  authGetMiddleware,
  authMiddleware,
  registerUserMiddleware,
} from "./auth.middleware.js";

const auth = new Hono();

auth.get("/", authGetMiddleware, loginGetController);

auth.post("/", authMiddleware, loginController);

auth.post("/securedPrime", authMiddleware, adminController);

auth.post("/register", registerUserMiddleware, registerUserController);

export default auth;
