import { Hono } from "hono";
import {
  merchantDeleteController,
  merchantGetController,
  merchantPatchController,
  merchantPostController,
} from "./merchant.controller.js";
import {
  merchantDeleteMiddleware,
  merchantGetMiddleware,
  merchantPatchMiddleware,
  merchantPostMiddleware,
} from "./merchant.middleware.js";

const merchant = new Hono();

merchant.post("/", merchantPostMiddleware, merchantPostController);

merchant.patch("/", merchantPatchMiddleware, merchantPatchController);

merchant.delete("/", merchantDeleteMiddleware, merchantDeleteController);

merchant.get("/", merchantGetMiddleware, merchantGetController);

export default merchant;
