import { Hono } from "hono";
import {
  userGenerateLinkController,
  userGetController,
  userPatchController,
  userPostController,
  userProfilePutController,
  userPutController,
  userSponsorController,
} from "./user.controller.js";
import {
  userGenerateLinkMiddleware,
  userGetMiddleware,
  userPatchMiddleware,
  userPostMiddleware,
  userProfilePutMiddleware,
  userPutMiddleware,
  userSponsorMiddleware,
} from "./user.middleware.js";

const user = new Hono();

user.post("/", userPostMiddleware, userPostController);

user.put("/", userPutMiddleware, userPutController);

user.get("/", userGetMiddleware, userGetController);

user.patch("/:id", userPatchMiddleware, userPatchController);

user.put("/:id", userProfilePutMiddleware, userProfilePutController);

user.post(
  "/generate-link",
  userGenerateLinkMiddleware,
  userGenerateLinkController
);

user.post("/sponsor", userSponsorMiddleware, userSponsorController);

export default user;
