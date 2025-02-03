import { Hono } from "hono";
import { protectionMiddleware } from "../middleware/protection.middleware.js";
import auth from "./auth/auth.route.js";
import dashboard from "./dashboard/dashboard.route.js";
import deposit from "./deposit/deposit.route.js";
import health from "./health/health.route.js";
import leaderboard from "./leaderboard/leaderboard.route.js";
import merchant from "./merchant/merchant.route.js";
import options from "./options/options.route.js";
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
app.use("/deposit/*", protectionMiddleware);
//user route
app.route("/user", user);
app.use("/user/*", protectionMiddleware);
//transaction route
app.route("/transaction", transaction);
app.use("/transaction/*", protectionMiddleware);
//referral route
app.route("/referral", referral);
app.use("/referral/*", protectionMiddleware);
//package route
app.route("/package", packages);
app.use("/package/*", protectionMiddleware);
//merchant route
app.route("/merchant", merchant);
app.use("/merchant/*", protectionMiddleware);
//withdraw route
app.route("/withdraw", withdraw);
app.use("/withdraw/*", protectionMiddleware);
//dashboard route
app.route("/dashboard", dashboard);
app.use("/dashboard/*", protectionMiddleware);
//leaderboard route
app.route("/leaderboard", leaderboard);
app.use("/leaderboard/*", protectionMiddleware);
//options route
app.route("/options", options);
app.use("/options/*", protectionMiddleware);
app.get("/", (c) => c.text("This is the api endpoint"));
export default app;
