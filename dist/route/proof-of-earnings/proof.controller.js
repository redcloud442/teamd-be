import { invalidateCache, invalidateCacheVersion, sendErrorResponse, } from "../../utils/function.js";
import { proofGetModel, proofVideoDeleteModel, proofVideoGetModel, proofVideoPostModel, } from "./proof.model.js";
export const proofGetController = async (c) => {
    try {
        const data = await proofGetModel();
        return c.json({ data }, 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const proofVideoGetController = async (c) => {
    try {
        const { take, page } = c.get("params");
        const data = await proofVideoGetModel(take, page);
        return c.json(data, 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const proofVideoPostController = async (c) => {
    try {
        const params = c.get("params");
        const data = await proofVideoPostModel(params);
        await invalidateCacheVersion("proof-of-earnings-video");
        await invalidateCache("proof-of-earnings");
        return c.json(data, 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const proofVideoDeleteController = async (c) => {
    try {
        const params = c.get("params");
        const data = await proofVideoDeleteModel(params);
        await invalidateCacheVersion("proof-of-earnings-video");
        await invalidateCache("proof-of-earnings");
        return c.json(data, 200);
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
