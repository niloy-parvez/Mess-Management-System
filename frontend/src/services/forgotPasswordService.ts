// Forgot Password Service
import apiClient from "./apiClient";
import { ApiResponse } from "../types";

export const forgotPasswordService = {
  requestReset: async (email: string) => {
    const response = await apiClient.post<ApiResponse<{
      message: string;
      resetToken?: string;
    }>>("/auth/forgot-password", { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/reset-password",
      { token, newPassword }
    );
    return response.data;
  },
};
