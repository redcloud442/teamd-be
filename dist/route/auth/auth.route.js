import { Hono } from "hono";
import { adminController, loginController, loginGetController, registerUserController, } from "./auth.controller.js";
import { authMiddleware, registerUserMiddleware } from "./auth.middleware.js";
const auth = new Hono();
auth.get("/", loginGetController);
auth.post("/", authMiddleware, loginController);
auth.post("/admin", authMiddleware, adminController);
auth.post("/register", registerUserMiddleware, registerUserController);
export default auth;
