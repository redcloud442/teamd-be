import { Hono } from "hono";
import { depositHistoryPostController, depositListPostController, depositPostController, depositPutController, } from "./deposit.controller.js";
import { depositHistoryPostMiddleware, depositListPostMiddleware, depositMiddleware, depositPutMiddleware, } from "./deposit.middleware.js";
const deposit = new Hono();
deposit.post("/", depositMiddleware, depositPostController);
deposit.post("/history", depositHistoryPostMiddleware, depositHistoryPostController);
deposit.put("/:id", depositPutMiddleware, depositPutController);
deposit.post("/list", depositListPostMiddleware, depositListPostController);
export default deposit;
