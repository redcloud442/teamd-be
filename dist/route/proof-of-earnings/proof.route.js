import { Hono } from "hono";
import { proofGetController, proofVideoDeleteController, proofVideoGetController, proofVideoPostController, } from "./proof.controller.js";
import { packagePostMiddleware, proofVideoDeleteMiddleware, proofVideoMiddleware, proofVideoPostMiddleware, } from "./proof.middleware.js";
const proof = new Hono();
proof.get("/video", proofVideoMiddleware, proofVideoGetController);
proof.get("/", packagePostMiddleware, proofGetController);
proof.post("/video", proofVideoPostMiddleware, proofVideoPostController);
proof.delete("/video/:id", proofVideoDeleteMiddleware, proofVideoDeleteController);
export default proof;
