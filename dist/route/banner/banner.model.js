import prisma from "../../utils/prisma.js";
import { redis } from "../../utils/redis.js";
export const bannerPostModel = async (company_promo_image) => {
    const banner = await prisma.company_promo_table.create({
        data: {
            company_promo_image,
        },
        select: {
            company_promo_id: true,
            company_promo_image: true,
            company_promo_date: true,
        },
    });
    await redis.del("banner");
    return banner;
};
export const bannerPutModel = async (id, company_promo_image) => {
    const banner = await prisma.company_promo_table.update({
        where: { company_promo_id: id },
        data: { company_promo_image },
        select: {
            company_promo_id: true,
            company_promo_image: true,
            company_promo_date: true,
        },
    });
    await redis.del("banner");
    return banner;
};
export const bannerDeleteModel = async (id) => {
    const banner = await prisma.company_promo_table.delete({
        where: { company_promo_id: id },
    });
    await redis.del("banner");
    return banner;
};
export const bannerGetModel = async () => {
    const cache = await redis.get("banner");
    if (cache) {
        return cache;
    }
    const banner = await prisma.company_promo_table.findMany({
        orderBy: {
            company_promo_id: "desc",
        },
    });
    await redis.set("banner", JSON.stringify(banner), { ex: 60 * 10 });
    return banner;
};
