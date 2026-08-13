import { Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import dashboardService from "../services/dashboardService";

export const getDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const stats = await dashboardService.fetchDashboardStats();
    sendSuccess(res, stats, "Dashboard statistics fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch dashboard stats", error?.message || "Internal server error", 500);
  }
};

export const getRecentActivities = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const limit = Number(req.query.limit || 10);
    const activities = await dashboardService.fetchRecentActivities(limit);
    sendSuccess(res, activities, "Recent activities fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch recent activities", error.message, 500);
  }
};
