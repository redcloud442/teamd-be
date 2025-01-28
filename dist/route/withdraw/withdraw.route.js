import { Hono } from "hono";
import { updateWithdrawPostController, withdrawHistoryPostController, withdrawPostController, } from "./withdraw.controller.js";
import { updateWithdrawMiddleware, withdrawHistoryPostMiddleware, withdrawPostMiddleware, } from "./withdraw.middleware.js";
const withdraw = new Hono();
withdraw.post("/", withdrawPostMiddleware, withdrawPostController);
withdraw.post("/history", withdrawHistoryPostMiddleware, withdrawHistoryPostController);
withdraw.put("/:id", updateWithdrawMiddleware, updateWithdrawPostController);
export default withdraw;
