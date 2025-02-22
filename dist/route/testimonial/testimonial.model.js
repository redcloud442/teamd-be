import prisma from "../../utils/prisma.js";
export const testimonialModelPost = async (url) => {
    await prisma.alliance_testimonial_table.createMany({
        data: url.map((url) => ({
            alliance_testimonial_url: url,
            alliance_testimonial_is_hidden: false,
        })),
    });
    const data = await prisma.alliance_testimonial_table.findMany({
        where: {
            alliance_testimonial_url: {
                in: url,
            },
        },
    });
    return data;
};
export const testimonialModelGet = async (params) => {
    const { take, skip } = params;
    const offset = (skip - 1) * take;
    const testimonial = await prisma.alliance_testimonial_table.findMany({
        where: {
            alliance_testimonial_is_hidden: false,
        },
        select: {
            alliance_testimonial_url: true,
            alliance_testimonial_id: true,
        },
        orderBy: {
            alliance_testimonial_date_created: "desc",
        },
        take,
        skip: offset,
    });
    const total = await prisma.alliance_testimonial_table.count({
        where: {
            alliance_testimonial_is_hidden: false,
        },
    });
    return {
        testimonial,
        total,
    };
};
export const testimonialModelPut = async (params) => {
    const { id } = params;
    await prisma.$transaction(async (tx) => {
        const testimonial = await tx.alliance_testimonial_table.update({
            where: {
                alliance_testimonial_id: id,
            },
            data: {
                alliance_testimonial_is_hidden: true,
            },
        });
        return testimonial;
    });
    return {
        message: "Testimonial hidden successfully",
    };
};
