import apiClient from "./apiClient";
import { ApiResponse } from "../types";

export const paymentService = {
  createPayment: async (data: {
    member_id: string;
    amount: number;
    payment_method: string;
    payment_date?: string;
    reference?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post<ApiResponse<any>>("/payments", data);
    return response.data;
  },

  getPayments: async (page = 1, limit = 20, filters?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<any[]>>("/payments", {
      params: { page, limit, ...filters },
    });
    return response.data;
  },

  verifyPayment: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/payments/${id}/verify`);
    return response.data;
  },

  deletePayment: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/payments/${id}`);
    return response.data;
  },
};
