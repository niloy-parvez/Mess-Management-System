import apiClient from "./apiClient";
import { ApiResponse } from "../types";

export const mealService = {
  markMeal: async (payload: { member_id: string; meal_type: string; meal_date?: string }) => {
    const response = await apiClient.post<ApiResponse<any>>("/meals", payload);
    return response.data;
  },

  getMeals: async (page = 1, limit = 20, filters?: any) => {
    const response = await apiClient.get<ApiResponse<any[]>>("/meals", {
      params: { page, limit, ...filters },
    });
    return response.data;
  },

  deleteMeal: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/meals/${id}`);
    return response.data;
  },

  getMealStats: async (memberId?: string) => {
    const response = await apiClient.get<ApiResponse<any>>(`/meals/stats`, { params: { member_id: memberId } });
    return response.data;
  },
};
