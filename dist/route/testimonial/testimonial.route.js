import { Hono } from "hono";
import { testimonialGetController, testimonialPostController, testimonialPutController, } from "./testimonial.controller.js";
import { testimonialGetMiddleware, testimonialPostMiddleware, testimonialPutMiddleware, } from "./testimonial.middleware.js";
const testimonial = new Hono();
testimonial.post("/", testimonialPostMiddleware, testimonialPostController);
testimonial.get("/", testimonialGetMiddleware, testimonialGetController);
testimonial.put("/:id", testimonialPutMiddleware, testimonialPutController);
export default testimonial;
