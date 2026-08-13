import { Request, Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import { isMissingTableError, handleMissingTableError } from "../utils/dbHelpers";

// Notifications are persisted in Supabase. If the notifications table is missing, report the schema issue without fallback.

export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: "payment" | "market" | "notice" | "backup" | "member" | "due_update" | "payment_update" | "monthly_lock",
  relatedId?: string,
  data?: Record<string, unknown>
): Promise<void> => {
  try {
    const { error } = await supabase.from("notifications").insert([
      {
        user_id: userId,
        title,
        message,
        notification_type: type,
        related_id: relatedId || null,
        data: data || null,
      },
    ]);

    if (error && isMissingTableError(error)) {
      console.error("[Notifications] Notifications table missing or inaccessible; notification will not be persisted:", { message: error?.message, code: error?.code });
      // Do not create an in-memory fallback in production; surface the issue for migration
      return;
    }

    if (error) {
      throw error;
    }
  } catch (error: any) {
    if (isMissingTableError(error)) {
      console.error("[Notifications] Notifications table missing or inaccessible; notification will not be persisted:", { message: (error as any)?.message, code: (error as any)?.code });
      return;
    }
    console.error("Failed to create notification in database:", error);
  }
};

export const getNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, "Unauthorized", undefined, 401);
      return;
    }

    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to fetch notifications", error.message, 500);
      return;
    }

    sendSuccess(res, notifications || [], "Notifications fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch notifications", error.message, 500);
  }
};

export const getUnreadNotifications = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, "Unauthorized", undefined, 401);
      return;
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to fetch unread count", error.message, 500);
      return;
    }

    sendSuccess(res, { count: count || 0 }, "Unread count fetched");
  } catch (error: any) {
    sendError(res, "Failed to fetch unread count", error.message, 500);
  }
};

export const markAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.body;

    if (!userId || !notificationId) {
      sendError(res, "Invalid request", undefined, 400);
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("id", notificationId);

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to mark notification as read", error.message, 500);
      return;
    }

    sendSuccess(res, null, "Notification marked as read");
  } catch (error: any) {
    sendError(res, "Failed to mark as read", error.message, 500);
  }
};

export const markAllAsRead = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      sendError(res, "Unauthorized", undefined, 401);
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId);

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to mark all notifications as read", error.message, 500);
      return;
    }

    sendSuccess(res, null, "All notifications marked as read");
  } catch (error: any) {
    sendError(res, "Failed to mark all as read", error.message, 500);
  }
};

export const deleteNotification = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;

    if (!userId || !notificationId) {
      sendError(res, "Invalid request", undefined, 400);
      return;
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("id", notificationId);

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to delete notification", error.message, 500);
      return;
    }

    sendSuccess(res, null, "Notification deleted");
  } catch (error: any) {
    sendError(res, "Failed to delete notification", error.message, 500);
  }
};

