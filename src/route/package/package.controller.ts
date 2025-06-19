import type { Context } from "hono";
import {
  invalidateCache,
  invalidateCacheVersion,
  invalidateMultipleCache,
  sendErrorResponse,
} from "../../utils/function.js";
import {
  claimPackagePostModel,
  packageCreatePostModel,
  packageGetIdModel,
  packageGetModel,
  packageListGetAdminModel,
  packageListGetModel,
  packagePostModel,
  packagePostReinvestmentModel,
  packageUpdatePutModel,
} from "./package.model.js";

export const packagePostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    await packagePostModel({
      amount: params.amount,
      packageId: params.packageId,
      teamMemberProfile: teamMemberProfile,
    });

    await Promise.all([
      invalidateCacheVersion(
        `transaction:${teamMemberProfile.company_member_id}:EARNINGS`
      ),
      invalidateMultipleCache([
        `user-${teamMemberProfile.company_user_id}`,
        `user-model-get-${teamMemberProfile.company_member_id}`,
        `package-purchase-summary:${teamMemberProfile.company_member_id}:${params.package_id}`,
        `package-list:${teamMemberProfile.company_member_id}`,
      ]),
    ]);

    return c.json({ message: "Package Created" }, 200);
  } catch (error) {
    console.log(error);
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packageGetController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await packageGetModel(teamMemberProfile.company_member_id);

    return c.json(data, 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packagesCreatePostController = async (c: Context) => {
  try {
    const {
      packageName,
      packageDescription,
      packagePercentage,
      packageDays,
      packageGif,
      packageImage,
    } = await c.req.json();

    const result = await packageCreatePostModel({
      packageName,
      packageDescription,
      packagePercentage,
      packageDays,
      packageGif,
      packageImage,
    });

    return c.json({ message: "Package Created", data: result });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packagesUpdatePutController = async (c: Context) => {
  try {
    const { packageData } = await c.req.json();

    const {
      packageName,
      packageDescription,
      packagePercentage,
      packageDays,
      packageIsDisabled,
      packageGif,
      package_image,
    } = packageData;

    const id = c.req.param("id");

    const result = await packageUpdatePutModel({
      packageName,
      packageDescription,
      packagePercentage,
      packageDays,
      packageIsDisabled,
      packageGif,
      package_image,
      packageId: id,
    });

    return c.json({ message: "Package Updated", data: result });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packagesClaimPostController = async (c: Context) => {
  try {
    const { amount, earnings, packageConnectionId } = await c.req.json();

    const teamMemberProfile = c.get("teamMemberProfile");

    await claimPackagePostModel({
      amount,
      earnings,
      packageConnectionId,
      teamMemberProfile,
    });

    await Promise.all([
      invalidateCacheVersion(
        `transaction:${teamMemberProfile.company_member_id}:EARNINGS`
      ),
      invalidateCache(`user-model-get-${teamMemberProfile.company_member_id}`),
    ]);

    return c.json({ message: "Package Claimed" });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packagesListPostController = async (c: Context) => {
  try {
    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await packageListGetModel({ teamMemberProfile });

    return c.json({ data });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packagesGetAdminController = async (c: Context) => {
  try {
    const data = await packageListGetAdminModel();

    return c.json({ data });
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packageReinvestmentPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const user = c.get("user");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await packagePostReinvestmentModel({
      amount: params.amount,
      packageId: params.packageId,
      teamMemberProfile: teamMemberProfile,
      user: user,
    });

    return c.json(data, 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const packageGetIdController = async (c: Context) => {
  try {
    const params = c.get("params");

    const teamMemberProfile = c.get("teamMemberProfile");

    const data = await packageGetIdModel({
      id: params.id,
      memberId: teamMemberProfile.company_member_id,
    });

    return c.json(data, 200);
  } catch (error) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
