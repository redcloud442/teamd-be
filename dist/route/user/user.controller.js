import { invalidateCache, invalidateCacheVersion, } from "../../utils/function.js";
import { userActiveListModel, userChangePasswordModel, userGenerateLinkModel, userGetSearchModel, userListModel, userListReinvestedModel, userModelGet, userModelGetById, userModelGetByIdUserProfile, userModelGetByUserIdData, userModelPost, userModelPut, userPatchModel, userProfileModelPut, userProfileUpdateModel, userReferralModel, userSponsorModel, userTreeModel, } from "./user.model.js";
export const userPutController = async (c) => {
    try {
        const { email, password, userId } = await c.req.json();
        await userModelPut({ email, password, userId });
        return c.json({ message: "User Updated" });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userPostController = async (c) => {
    try {
        const { memberId } = await c.req.json();
        const user = await userModelPost({ memberId });
        return c.json(user);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userGetController = async (c) => {
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await userModelGet({
            memberId: teamMemberProfile.company_member_id,
        });
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userGetByIdUserProfileController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userModelGetByIdUserProfile(params);
        console.log(data);
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userGetByIdController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userModelGetById(params);
        return c.json(data, 200);
    }
    catch (error) {
        c;
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userProfileGetController = async (c) => {
    try {
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await userModelGetByUserIdData({
            company_user_id: teamMemberProfile.company_user_id,
        });
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userProfileUpdateController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userProfileUpdateModel(params);
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userPatchController = async (c) => {
    try {
        const { action, role, type } = await c.req.json();
        const { id } = c.req.param();
        const userId = await userPatchModel({ memberId: id, action, role, type });
        await Promise.all([
            invalidateCache(`user-${userId}`),
            invalidateCacheVersion("user-list"),
        ]);
        return c.json({ message: "User Updated" });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userSponsorController = async (c) => {
    try {
        const { userId } = await c.req.json();
        const data = await userSponsorModel({ userId });
        return c.json(data, { status: 200 });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userProfilePutController = async (c) => {
    try {
        const { profilePicture } = await c.req.json();
        const { id } = c.req.param();
        const teamMemberProfile = c.get("teamMemberProfile");
        await userProfileModelPut({ profilePicture, userId: id });
        await invalidateCache(`user-${teamMemberProfile.company_user_id}`);
        return c.json({ message: "Profile Updated" });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userGenerateLinkController = async (c) => {
    try {
        const { formattedUserName } = await c.req.json();
        const data = await userGenerateLinkModel({ formattedUserName });
        return c.json({ url: data });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userListController = async (c) => {
    try {
        const params = c.get("params");
        const teamMemberProfile = c.get("teamMemberProfile");
        const data = await userListModel(params, teamMemberProfile);
        return c.json(data, { status: 200 });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userActiveListController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userActiveListModel(params);
        return c.json(data, { status: 200 });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userChangePasswordController = async (c) => {
    try {
        const params = c.get("params");
        await userChangePasswordModel(params);
        return c.json({ message: "Password Updated" });
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userListReinvestedController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userListReinvestedModel(params);
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userTreeController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userTreeModel(params);
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userGetSearchController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userGetSearchModel(params);
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
export const userReferralController = async (c) => {
    try {
        const params = c.get("params");
        const data = await userReferralModel(params);
        return c.json(data, 200);
    }
    catch (error) {
        return c.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
