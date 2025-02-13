import { getClientIP } from "../../utils/function.js";
import { adminModel, loginGetModel, loginModel, registerUserModel, } from "./auth.model.js";
export const loginController = async (c) => {
    try {
        const ip = getClientIP(c.req.raw);
        const params = c.get("params");
        await loginModel({ ...params, ip });
        return c.json({ message: "Login successful" }, 200);
    }
    catch (error) {
        return c.json({ message: "Invalid username or password" }, 401);
    }
};
export const loginGetController = async (c) => {
    try {
        const userName = c.get("userName");
        if (!userName) {
            return c.json({ message: "userName query parameter is required" }, 400);
        }
        const user = await loginGetModel(userName);
        if (user) {
            return c.json({ message: "User exists" }, 400);
        }
        return c.json({ message: "User does not exist" }, 200);
    }
    catch (error) {
        console.log(error);
        return c.json({ message: "Error occurred" }, 500);
    }
};
export const adminController = async (c) => {
    try {
        const params = c.get("params");
        await adminModel(params);
        return c.json({ message: "Admin login successful" }, 200);
    }
    catch (error) {
        return c.json({ message: "Error occurred" }, 500);
    }
};
export const registerUserController = async (c) => {
    try {
        const params = c.get("params");
        const ip = getClientIP(c.req.raw);
        await registerUserModel({ ...params, ip });
        return c.json({ message: "User created" }, 200);
    }
    catch (error) {
        return c.json({ message: "Error occurred" }, 500);
    }
};
