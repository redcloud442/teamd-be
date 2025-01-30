import { Hono } from "hono";
import { transactionPostMiddleware } from "./transaction.middleware.js";
import { transactionPostController } from "./transation.controller.js";
const transaction = new Hono();
transaction.post("/", transactionPostMiddleware, transactionPostController);
export default transaction;
