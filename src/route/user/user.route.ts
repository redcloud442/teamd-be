import { Hono } from "hono";
import {
  userActiveListController,
  userChangePasswordController,
  userGenerateLinkController,
  userGetByIdUserProfileController,
  userGetController,
  userGetSearchController,
  userListController,
  userListReinvestedController,
  userPatchController,
  userPostController,
  userProfileGetController,
  userProfilePutController,
  userProfileUpdateController,
  userPutController,
  userReferralController,
  userSponsorController,
  userTreeController,
} from "./user.controller.js";
import {
  userActiveListMiddleware,
  userChangePasswordMiddleware,
  userGenerateLinkMiddleware,
  userGetByIdUserProfileMiddleware,
  userGetMiddleware,
  userGetSearchMiddleware,
  userListMiddleware,
  userListReinvestedMiddleware,
  userPatchMiddleware,
  userPostMiddleware,
  userProfileGetMiddleware,
  userProfilePutMiddleware,
  userProfileUpdateMiddleware,
  userPutMiddleware,
  userReferralMiddleware,
  userSponsorMiddleware,
  userTreeMiddleware,
} from "./user.middleware.js";

const user = new Hono();

user.get("/search", userGetSearchMiddleware, userGetSearchController);

user.post("/profile-data", userProfileGetMiddleware, userProfileGetController);

user.post(
  "/generate-link",
  userGenerateLinkMiddleware,
  userGenerateLinkController
);

user.post(
  "/list/reinvested",
  userListReinvestedMiddleware,
  userListReinvestedController
);

user.post("/sponsor", userSponsorMiddleware, userSponsorController);

user.post("/list", userListMiddleware, userListController);

user.post("/active-list", userActiveListMiddleware, userActiveListController);

user.get("/:id/tree", userTreeMiddleware, userTreeController);

user.put(
  "/:id/change-password",
  userChangePasswordMiddleware,
  userChangePasswordController
);

user.post("/:id/referral", userReferralMiddleware, userReferralController);

user.get(
  "/:id/user-profile",
  userGetByIdUserProfileMiddleware,
  userGetByIdUserProfileController
);

user.put(
  "/:id/update-profile",
  userProfileUpdateMiddleware,
  userProfileUpdateController
);

user.put("/:id", userProfilePutMiddleware, userProfilePutController);

user.patch("/:id", userPatchMiddleware, userPatchController);

// ✅ Fully dynamic and base routes LAST
user.get("/:id", userGetMiddleware, userGetController);

user.get("/", userGetMiddleware, userGetController);

user.post("/", userPostMiddleware, userPostController);

user.put("/", userPutMiddleware, userPutController);

export default user;
