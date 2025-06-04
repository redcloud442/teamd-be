import { Hono } from "hono";

import {
  packageGetController,
  packageGetIdController,
  packagePostController,
  packagesClaimPostController,
  packagesCreatePostController,
  packagesGetAdminController,
  packagesListPostController,
  packagesUpdatePutController,
} from "./package.controller.js";
import {
  packageCreatePostMiddleware,
  packageGetIdMiddleware,
  packageGetMiddleware,
  packagePostMiddleware,
  packagesClaimPostMiddleware,
  packagesGetListMiddleware,
  packageUpdatePutMiddleware,
} from "./package.middleware.js";

const packages = new Hono();

packages.post("/", packagePostMiddleware, packagePostController);

packages.get("/:id", packageGetIdMiddleware, packageGetIdController);

packages.get("/", packageGetMiddleware, packageGetController);

packages.put("/:id", packageUpdatePutMiddleware, packagesUpdatePutController);

packages.post("/list", packageGetMiddleware, packagesListPostController);

packages.get(
  "/get-all/list",
  packagesGetListMiddleware,
  packagesGetAdminController
);

packages.post(
  "/create",
  packageCreatePostMiddleware,
  packagesCreatePostController
);

packages.post(
  "/claim",
  packagesClaimPostMiddleware,
  packagesClaimPostController
);

// packages.post(
//   "/reinvestment",
//   packagePostMiddleware,
//   packageReinvestmentPostController
// );

export default packages;
