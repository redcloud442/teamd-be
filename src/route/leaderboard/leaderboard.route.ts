import { Hono } from "hono";
import { leaderboardPostController } from "./leaderboard.controller.js";
import { leaderboardPostMiddleware } from "./leaderboard.middleware.js";

const leaderboard = new Hono();

leaderboard.post("/", leaderboardPostMiddleware, leaderboardPostController);

export default leaderboard;
