import { sendErrorResponse } from "../../utils/function.js";
import { testimonialModelGet, testimonialModelPost, testimonialModelPut, } from "./testimonial.model.js";
export const testimonialPostController = async (c) => {
    try {
        const params = c.get("params");
        const response = await testimonialModelPost(params);
        return c.json(response, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const testimonialGetController = async (c) => {
    try {
        const params = c.get("params");
        const response = await testimonialModelGet(params);
        return c.json(response, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
export const testimonialPutController = async (c) => {
    try {
        const params = c.get("params");
        const response = await testimonialModelPut(params);
        return c.json(response, 200);
    }
    catch (e) {
        return sendErrorResponse("Internal Server Error", 500);
    }
};
