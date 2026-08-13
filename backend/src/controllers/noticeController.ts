import { Request, Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { resolveRequesterId } from "../utils/auth";
import { AuthRequest } from "../middlewares/auth";

export const createNotice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { title, content, priority = "normal" } = req.body;

    if (!title || !content) {
      sendError(res, "Title and content are required", undefined, 400);
      return;
    }

    const validPriorities = ["low", "normal", "high", "urgent"];
    const normalizedPriority = validPriorities.includes(priority) ? priority : "normal";

    const { data: notice, error } = await supabase
      .from("notices")
      .insert([
        {
          title,
          content,
          priority: normalizedPriority,
          created_by: resolveRequesterId(req),
          is_archived: false,
        },
      ])
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to create notice", error.message, 500);
      return;
    }

    sendSuccess(res, notice, "Notice created successfully", 201);
  } catch (error: any) {
    sendError(res, "Failed to create notice", error.message, 500);
  }
};

export const getNotices = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 10, archived = "false" } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const offset = (pageNum - 1) * limitNum;

    const archivedFlag = archived === "true";
    let query = supabase.from("notices").select("*");

    query = query.eq("is_archived", archivedFlag);

    const { data: notices, error, count } = await query
      .range(offset, offset + limitNum - 1)
      .limit(limitNum)
      .order("created_at", { ascending: false });

    if (error) {
      sendError(res, "Failed to fetch notices", error.message, 500);
      return;
    }

    sendPaginated(
      res,
      notices || [],
      pageNum,
      limitNum,
      count || 0,
      "Notices fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch notices", error.message, 500);
  }
};

export const updateNotice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, content, archived } = req.body;

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (archived !== undefined) {
      updateData.is_archived = archived;
      updateData.archived_at = archived ? new Date().toISOString() : null;
    }

    const { data: notice, error } = await supabase
      .from("notices")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to update notice", error.message, 500);
      return;
    }

    sendSuccess(res, notice, "Notice updated successfully");
  } catch (error: any) {
    sendError(res, "Failed to update notice", error.message, 500);
  }
};

export const deleteNotice = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", id);

    if (error) {
      sendError(res, "Failed to delete notice", error.message, 500);
      return;
    }

    sendSuccess(res, null, "Notice deleted successfully");
  } catch (error: any) {
    sendError(res, "Failed to delete notice", error.message, 500);
  }
};
