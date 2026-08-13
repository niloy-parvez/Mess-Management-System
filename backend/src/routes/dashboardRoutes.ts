import { Router } from "express";
import { getDashboardStats, getRecentActivities } from "../controllers/dashboardController";
import { authMiddleware } from "../middlewares/auth";

const router = Router();

router.get("/stats", authMiddleware, getDashboardStats);
router.get("/activities", authMiddleware, getRecentActivities);

export default router;
