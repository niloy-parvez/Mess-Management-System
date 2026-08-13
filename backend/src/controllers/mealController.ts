import { Request, Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import { handleMissingTableError } from "../utils/dbHelpers";

// Local in-memory fallback for meals removed for production. Ensure the meals table exists and RLS/policies are configured.

export const markMeal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { member_id, meal_type, meal_date } = req.body;
    const allowedMealTypes = ["breakfast", "lunch", "dinner"];
    const normalizedMealDate = meal_date ? String(meal_date).split("T")[0] : new Date().toISOString().split("T")[0];

    if (!member_id || !meal_type) {
      sendError(res, "Member ID and meal type are required", undefined, 400);
      return;
    }

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      if (req.user.memberId !== member_id) {
        sendError(res, "You can only mark meals for your own profile", undefined, 403);
        return;
      }
    }

    if (!allowedMealTypes.includes(meal_type)) {
      sendError(res, "Invalid meal type", "meal_type must be breakfast, lunch, or dinner", 400);
      return;
    }

    // Verify the member exists and is active
    const { data: memberExists, error: memberCheckError } = await supabase
      .from("members")
      .select("id, name, is_active")
      .eq("id", member_id)
      .maybeSingle();

    if (memberCheckError) {
      sendError(res, "Failed to validate member", memberCheckError.message, 500);
      return;
    }

    if (!memberExists) {
      sendError(res, "Member not found", undefined, 404);
      return;
    }

    if (memberExists.is_active === false) {
      sendError(res, "Cannot mark meal for inactive member", undefined, 400);
      return;
    }

    const { data: existingMeal } = await supabase
      .from("meals")
      .select("id")
      .eq("member_id", member_id)
      .eq("meal_type", meal_type)
      .eq("meal_date", normalizedMealDate)
      .single();

    if (existingMeal) {
      sendError(res, "Meal already marked for this date", undefined, 409);
      return;
    }

    // Insert meal and return with member info
    const { data: meal, error } = await supabase
      .from("meals")
      .insert([
        {
          member_id,
          meal_type,
          meal_date: normalizedMealDate,
        },
      ])
      .select("*, member:members(id, name)")
      .single();

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to mark meal", error.message, 500);
      return;
    }

    // Normalize meal to include member_name to avoid exposing UUID on UI
    const normalizedMeal = {
      ...meal,
      member_name: meal?.member?.full_name || meal?.member?.name || undefined,
    };

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, normalizedMeal, "Meal marked successfully", 201);
  } catch (error: any) {
    sendError(res, "Failed to mark meal", error.message, 500);
  }
};

export const getMeals = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { member_id, page = 1, limit = 20, month, year } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const offset = (pageNum - 1) * limitNum;
  const monthNum = month ? parseInt(month as string, 10) : null;
  const yearNum = year ? parseInt(year as string, 10) : null;

  try {
    // Select meals with member join so frontend can display member name (no UUID in UI)
    let query = supabase.from("meals").select("*, member:members(id, name)", { count: "exact" });

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      query = query.eq("member_id", req.user.memberId);
    } else if (member_id) {
      query = query.eq("member_id", member_id as string);
    }

    if (monthNum && yearNum) {
      const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
      const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${new Date(yearNum, monthNum, 0).getDate()}`;
      query = query.gte("meal_date", startDate).lte("meal_date", endDate);
    } else if (yearNum) {
      const startDate = `${yearNum}-01-01`;
      const endDate = `${yearNum}-12-31`;
      query = query.gte("meal_date", startDate).lte("meal_date", endDate);
    }

    const { data: meals, error, count } = await query
      .order("meal_date", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to fetch meals", error.message, 500);
      return;
    }

    // Normalize meals to include member_name and avoid exposing UUID in UI
    const normalizedMeals = (meals || []).map((m: any) => ({
      ...m,
      member_name: m?.member?.full_name || m?.member?.name || m.member_name || undefined,
    }));

    sendPaginated(
      res,
      normalizedMeals,
      pageNum,
      limitNum,
      count || 0,
      "Meals fetched successfully"
    );
  } catch (error: any) {
    if (handleMissingTableError(res, error)) {
      return;
    }
    sendError(res, "Failed to fetch meals", error.message, 500);
  }
};

export const getMealStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { member_id, month, year } = req.query;
    const monthNum = month ? parseInt(month as string, 10) : null;
    const yearNum = year ? parseInt(year as string, 10) : null;

    let query = supabase.from("meals").select("meal_type");

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      query = query.eq("member_id", req.user.memberId);
    } else if (member_id) {
      query = query.eq("member_id", member_id as string);
    }

    if (monthNum && yearNum) {
      const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
      const endDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-${new Date(yearNum, monthNum, 0).getDate()}`;
      query = query.gte("meal_date", startDate).lte("meal_date", endDate);
    } else if (yearNum) {
      const startDate = `${yearNum}-01-01`;
      const endDate = `${yearNum}-12-31`;
      query = query.gte("meal_date", startDate).lte("meal_date", endDate);
    }

    const { data: meals, error } = await query;

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to fetch meal stats", error.message, 500);
      return;
    }

    const stats = meals?.reduce(
      (acc, meal) => {
        const type = meal.meal_type as string;
        if (type === "breakfast") acc.breakfast += 1;
        if (type === "lunch") acc.lunch += 1;
        if (type === "dinner") acc.dinner += 1;
        return acc;
      },
      { breakfast: 0, lunch: 0, dinner: 0 }
    );

    sendSuccess(res, stats, "Meal statistics fetched successfully");
  } catch (error: any) {
    if (handleMissingTableError(res, error)) {
      return;
    }
    sendError(res, "Failed to fetch meal stats", error.message, 500);
  }
};

export const deleteMeal = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    if (req.user?.role !== "admin") {
      sendError(res, "Admin access required", undefined, 403);
      return;
    }

    const { error } = await supabase
      .from("meals")
      .delete()
      .eq("id", id);

    if (error) {
      sendError(res, "Failed to delete meal", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, null, "Meal deleted successfully");
  } catch (error: any) {
    sendError(res, "Failed to delete meal", error.message, 500);
  }
};
