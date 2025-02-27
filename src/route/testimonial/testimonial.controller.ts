import { sendErrorResponse } from "../../utils/function.js";

import type { Context } from "hono";
import {
  testimonialModelGet,
  testimonialModelPost,
  testimonialModelPut,
} from "./testimonial.model.js";

export const testimonialPostController = async (c: Context) => {
  try {
    const params = c.get("params");

    const response = await testimonialModelPost(params);

    return c.json(response, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const testimonialGetController = async (c: Context) => {
  try {
    const params = c.get("params");

    const response = await testimonialModelGet(params);

    return c.json(response, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};

export const testimonialPutController = async (c: Context) => {
  try {
    const params = c.get("params");

    const response = await testimonialModelPut(params);

    return c.json(response, 200);
  } catch (e) {
    return sendErrorResponse("Internal Server Error", 500);
  }
};
