import { sendErrorResponse } from "../../utils/function.js";
import prisma from "../../utils/prisma.js";
export const merchantGetModel = async () => {
    const merchant = await prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant_table.findMany({
            select: {
                merchant_id: true,
                merchant_account_number: true,
                merchant_account_type: true,
                merchant_account_name: true,
            },
        });
        return merchant;
    });
    return merchant;
};
export const merchantDeleteModel = async (params) => {
    const { merchantId } = params;
    const result = await prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant_table.findFirst({
            where: { merchant_id: merchantId },
        });
        if (!merchant)
            return sendErrorResponse("Merchant not found", 400);
        return await tx.merchant_table.delete({
            where: { merchant_id: merchantId },
        });
    });
    return result;
};
export const merchantPostModel = async (params) => {
    const { accountNumber, accountType, accountName } = params;
    const result = await prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant_table.findFirst({
            where: { merchant_account_number: accountNumber },
        });
        if (merchant)
            return sendErrorResponse("Merchant already exists", 400);
        return await tx.merchant_table.create({
            data: {
                merchant_account_number: accountNumber,
                merchant_account_type: accountType,
                merchant_account_name: accountName,
            },
        });
    });
    return result;
};
export const merchantPatchModel = async (params) => {
    const { memberId, amount } = params;
    const result = await prisma.$transaction(async (tx) => {
        const merchant = await tx.merchant_member_table.findFirst({
            where: { merchant_member_id: memberId },
        });
        if (!merchant)
            throw new Error("Merchant not found");
        return await tx.merchant_member_table.update({
            where: { merchant_member_id: memberId },
            data: {
                merchant_member_balance: {
                    increment: amount,
                },
            },
        });
    });
    return result;
};
