import { sendErrorResponse } from "../../utils/function.js";
import { merchantDeleteModel, merchantGetModel, merchantPatchModel, merchantPostModel, } from "./merchant.model.js";
export const merchantGetController = async (c) => {
    try {
        const merchant = await merchantGetModel();
        return c.json({ data: merchant });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const merchantDeleteController = async (c) => {
    try {
        const { merchantId } = await c.req.json();
        await merchantDeleteModel({ merchantId });
        return c.json({ message: "Merchant Deleted" });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const merchantPostController = async (c) => {
    try {
        const { accountNumber, accountType, accountName } = await c.req.json();
        await merchantPostModel({ accountNumber, accountType, accountName });
        return c.json({ message: "Merchant Created" });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const merchantPatchController = async (c) => {
    try {
        const { memberId, amount } = await c.req.json();
        await merchantPatchModel({ memberId, amount });
        return c.json({ message: "Merchant Updated" });
    }
    catch (error) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
