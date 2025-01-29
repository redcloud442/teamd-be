import { Hono } from "hono";
import {
  userGenerateLinkController,
  userGetController,
  userListController,
  userPatchController,
  userPostController,
  userProfilePutController,
  userPutController,
  userSponsorController,
} from "./user.controller.js";
import {
  userGenerateLinkMiddleware,
  userGetMiddleware,
  userListMiddleware,
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

user.post("/list", userListMiddleware, userListController);

export default user;
