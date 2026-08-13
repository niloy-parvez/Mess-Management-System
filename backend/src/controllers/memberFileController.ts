import { Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";

type UploadRequest = AuthRequest & {
  file?: {
    mimetype: string;
    originalname?: string;
  };
};

export const uploadMemberPhoto = async (
  req: UploadRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      if (req.user.memberId !== id) {
        sendError(res, "You can only upload your own profile photo", undefined, 403);
        return;
      }
    }
    
    if (!req.file) {
      sendError(res, "No file uploaded", undefined, 400);
      return;
    }

    // In production, upload to Supabase Storage
    // For now, generate a URL-safe filename
    const timestamp = Date.now();
    const photoUrl = `/uploads/members/${id}/photo-${timestamp}.${req.file.mimetype.split('/')[1]}`;

    // Update member profile photo URL
    const { data: member, error } = await supabase
      .from("members")
      .update({
        photo_url: photoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to upload photo", error.message, 500);
      return;
    }

    sendSuccess(res, { photoUrl, member }, "Photo uploaded successfully");
  } catch (error: any) {
    sendError(res, "Failed to upload photo", error.message, 500);
  }
};

export const deleteMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Soft delete: deactivate member instead of removing
    const { data: member, error } = await supabase
      .from("members")
      .update({
        is_active: false,
        leave_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to delete member", error.message, 500);
      return;
    }

    sendSuccess(res, member, "Member deleted successfully");
  } catch (error: any) {
    sendError(res, "Failed to delete member", error.message, 500);
  }
};

export const getDeletedMembers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { data: deletedMembers, error, count } = await supabase
      .from("members")
      .select("*", { count: "exact" })
      .eq("is_active", false)
      .range(offset, offset + limitNum - 1)
      .order("leave_date", { ascending: false });

    if (error) {
      sendError(res, "Failed to fetch deleted members", error.message, 500);
      return;
    }

    sendSuccess(res, deletedMembers || [], "Deleted members fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch deleted members", error.message, 500);
  }
};

export const restoreMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: member, error } = await supabase
      .from("members")
      .update({
        is_active: true,
        leave_date: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to restore member", error.message, 500);
      return;
    }

    sendSuccess(res, member, "Member restored successfully");
  } catch (error: any) {
    sendError(res, "Failed to restore member", error.message, 500);
  }
};
