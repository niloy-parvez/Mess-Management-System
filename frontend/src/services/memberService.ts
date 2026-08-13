import apiClient from "./apiClient";
import { ApiResponse, Member } from "../types";

export const memberService = {
  createMember: async (data: any) => {
    const response = await apiClient.post<ApiResponse<any>>("/members", data);
    return response.data;
  },

  getMembers: async (page = 1, limit = 10, filters?: any) => {
    const response = await apiClient.get<ApiResponse<Member[]>>("/members", {
      params: { page, limit, ...filters },
    });
    return response.data;
  },

  getMemberById: async (id: string) => {
    const response = await apiClient.get<ApiResponse<Member>>(`/members/${id}`);
    const resp = response.data;
    // Unwrap server-side profile envelope: { member, profile }
    if (resp && resp.data && (resp.data as any).member) {
      const member = (resp.data as any).member;
      const profile = (resp.data as any).profile || null;
      return { ...resp, data: member, profile } as any;
    }
    return resp as any;
  },

  updateMember: async (id: string, data: any) => {
    const response = await apiClient.patch<ApiResponse<Member>>(`/members/${id}`, data);
    return response.data;
  },

  deleteMember: async (id: string) => {
    const response = await apiClient.delete<ApiResponse<null>>(`/members/${id}`);
    return response.data;
  },

  deactivateMember: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Member>>(
      `/members/${id}/deactivate`,
      {}
    );
    return response.data;
  },

  activateMember: async (id: string) => {
    const response = await apiClient.patch<ApiResponse<Member>>(
      `/members/${id}/activate`,
      {}
    );
    return response.data;
  },

  uploadProfilePhoto: async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post<ApiResponse<{ photoUrl: string }>>(
      `/members/${id}/upload-photo`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return response.data;
  },
};
