import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
export const proofGetModel = async () => {
    const cacheKey = "proof-of-earnings";
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const proof = await prisma.company_proof_table.findMany();
    await redis.set(cacheKey, JSON.stringify(proof), { ex: 60 * 60 * 24 });
    return proof;
};
export const proofVideoGetModel = async (take, page) => {
    const version = (await redis.get("proof-of-earnings-video:version")) || "v1";
    const cacheKey = `proof-of-earnings-video-${take}-${page}:${version}`;
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
        return cachedData;
    }
    const offset = (page - 1) * take;
    const proof = await prisma.company_proof_table.findMany({
        orderBy: {
            company_proof_date: "desc",
        },
        skip: offset,
        take: take,
    });
    const total = await prisma.company_proof_table.count();
    const returnData = {
        data: proof,
        total,
    };
    await redis.set(cacheKey, JSON.stringify(returnData), { ex: 60 * 60 * 24 });
    return returnData;
};
export const proofVideoPostModel = async (params) => {
    const data = await prisma.company_proof_table.createManyAndReturn({
        data: params,
    });
    return data;
};
export const proofVideoDeleteModel = async (params) => {
    const data = await prisma.company_proof_table.delete({
        where: params,
    });
    return data;
};
