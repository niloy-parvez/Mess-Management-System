import apiClient from "./apiClient";
import { ApiResponse, DashboardStats } from "../types";

export const dashboardService = {
  getStats: async () => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>("/dashboard/stats");
    return response.data;
  },

  getRecentActivities: async (limit: number = 10) => {
    const response = await apiClient.get<ApiResponse<any[]>>("/dashboard/activities", {
      params: { limit },
    });
    return response.data;
  },
};
