import { Hono } from "hono";
import { dashboardGetController, dashboardPostController, } from "./dashboard.controller.js";
import { dashboardGetMiddleware, dashboardPostMiddleware, } from "./dashboard.middleware.js";
const dashboard = new Hono();
dashboard.post("/", dashboardPostMiddleware, dashboardPostController);
dashboard.get("/", dashboardGetMiddleware, dashboardGetController);
export default dashboard;
