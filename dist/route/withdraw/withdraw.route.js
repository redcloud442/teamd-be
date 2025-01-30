import { Hono } from "hono";
import { updateWithdrawPostController, withdrawHistoryPostController, withdrawListPostController, withdrawPostController, } from "./withdraw.controller.js";
import { updateWithdrawMiddleware, withdrawHistoryPostMiddleware, withdrawListPostMiddleware, withdrawPostMiddleware, } from "./withdraw.middleware.js";
const withdraw = new Hono();
withdraw.post("/", withdrawPostMiddleware, withdrawPostController);
withdraw.post("/history", withdrawHistoryPostMiddleware, withdrawHistoryPostController);
withdraw.put("/:id", updateWithdrawMiddleware, updateWithdrawPostController);
withdraw.post("/list", withdrawListPostMiddleware, withdrawListPostController);
export default withdraw;
