import { Hono } from "hono";
import auth from "./auth/auth.route.js";
import deposit from "./deposit/deposit.route.js";
import health from "./health/health.route.js";
import merchant from "./merchant/merchant.route.js";
import packages from "./package/package.route.js";
import referral from "./referral/referral.route.js";
import transaction from "./transaction/transaction.route.js";
import user from "./user/user.route.js";
import withdraw from "./withdraw/withdraw.route.js";
const app = new Hono();
//auth route
app.route("/auth", auth);
//health route
app.route("/health", health);
//deposit route
app.route("/deposit", deposit);
//user route
app.route("/user", user);
//transaction route
app.route("/transaction", transaction);
//referral route
app.route("/referral", referral);
//package route
app.route("/package", packages);
//merchant route
app.route("/merchant", merchant);
//withdraw route
app.route("/withdraw", withdraw);
app.get("/", (c) => c.text("This is the api endpoint"));
export default app;
