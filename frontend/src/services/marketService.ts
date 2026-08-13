import apiClient from "./apiClient";
import { ApiResponse } from "../types";

export const marketService = {
  createMarket: async (payload: {
    items: Array<{ name: string; quantity: number; unit: string; price: number }>;
    description?: string;
    receipt_url?: string;
    market_date?: string;
    total_cost?: number;
  }) => {
    const response = await apiClient.post<ApiResponse<any>>("/market", payload);
    return response.data;
  },

  getMarketItems: async (page = 1, limit = 20, filters?: Record<string, unknown>) => {
    const response = await apiClient.get<ApiResponse<any[]>>("/market", {
      params: { page, limit, ...filters },
    });
    return response.data;
  },

  approveMarketItem: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/market/${id}/approve`);
    return response.data;
  },

  rejectMarketItem: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<any>>(`/market/${id}/reject`);
    return response.data;
  },

  deleteMarketItem: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/market/${id}`);
    return response.data;
  },
};
