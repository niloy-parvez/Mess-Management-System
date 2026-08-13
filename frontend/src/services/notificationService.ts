import apiClient from "./apiClient";
import { ApiResponse, Notification } from "../types";

export const notificationService = {
  getNotifications: async () => {
    const response = await apiClient.get<ApiResponse<Notification[]>>("/notifications");
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await apiClient.get<ApiResponse<{ count: number }>>("/notifications/unread/count");
    return response.data;
  },

  markAsRead: async (notificationId: string) => {
    const response = await apiClient.post<ApiResponse<null>>(`/notifications/${notificationId}/read`, {
      notificationId,
    });
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await apiClient.post<ApiResponse<null>>("/notifications/read-all");
    return response.data;
  },

  deleteNotification: async (notificationId: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/notifications/${notificationId}`);
    return response.data;
  },
};
