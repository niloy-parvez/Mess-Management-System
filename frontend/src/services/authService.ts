import apiClient from "./apiClient";
import { ApiResponse, User } from "../types";

export const authService = {
  register: async (email: string, password: string, full_name: string, phone?: string) => {
    const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>("/auth/register", {
      email,
      password,
      full_name,
      phone,
    });
    return response.data;
  },

  login: async (email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<{ user: User; token: string }>>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await apiClient.get<ApiResponse<User>>("/auth/me");
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const response = await apiClient.post<ApiResponse<null>>("/auth/change-password", {
      oldPassword,
      newPassword,
    });
    return response.data;
  },
};
