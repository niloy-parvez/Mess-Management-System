import { Response } from "express";
import supabase, { supabaseClient } from "../config/supabase";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import { resolveRequesterId } from "../utils/auth";
import { handleMissingTableError } from "../utils/dbHelpers";

const VALID_EXPENSE_CATEGORIES = [
  "gas",
  "electricity",
  "internet",
  "water",
  "maid_salary",
  "maintenance",
  "others",
];


export const createExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { category, amount, description, expense_date } = req.body;

    if (!category || !amount) {
      sendError(res, "Category and amount are required", undefined, 400);
      return;
    }

    if (!VALID_EXPENSE_CATEGORIES.includes(category)) {
      sendError(res, "Invalid expense category", undefined, 400);
      return;
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      sendError(res, "Amount must be a positive number", undefined, 400);
      return;
    }

    // Try with service-role client first, fall back to anon client if service-role key is unregistered
    let insertResult = await supabase
      .from("expenses")
      .insert([
        {
          category,
          amount: normalizedAmount,
          description,
          expense_date: expense_date || new Date().toISOString().split("T")[0],
          created_by: resolveRequesterId(req),
        },
      ])
      .select()
      .single();

    let expense = insertResult.data;
    let error = insertResult.error;

    if (error) {
      // If service-role key problem, retry with anon client
      const { isServiceRoleKeyProblem } = await import("../utils/dbHelpers");
      if (isServiceRoleKeyProblem(error)) {
        const anonRes = await supabaseClient
          .from("expenses")
          .insert([
            {
              category,
              amount: normalizedAmount,
              description,
              expense_date: expense_date || new Date().toISOString().split("T")[0],
              created_by: resolveRequesterId(req),
            },
          ])
          .select()
          .single();
        expense = anonRes.data;
        error = anonRes.error;
      }
    }

    if (error) {
      if (handleMissingTableError(res, error, "Expenses table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to create expense", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, expense, "Expense created successfully", 201);
  } catch (error: any) {
    sendError(res, "Failed to create expense", error.message, 500);
  }
};

export const getExpenses = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, category, month, year } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build query using service-role client first
    let query = supabase.from("expenses").select("*", { count: "exact" });

    if (category) {
      query = query.eq("category", category);
    }

    if (month) {
      query = query.gte("expense_date", `${year || new Date().getFullYear()}-${String(month).padStart(2, "0")}-01`);
      query = query.lte("expense_date", `${year || new Date().getFullYear()}-${String(month).padStart(2, "0")}-31`);
    }

    let expenses: any = [];
    let count: number = 0;
    let error: any = null;

    try {
      const res = await query
        .order("expense_date", { ascending: false })
        .range(offset, offset + limitNum - 1)
        .limit(limitNum);
      expenses = res.data;
      count = res.count || 0;
      error = res.error;
    } catch (e) {
      error = e;
    }

    if (error) {
      const { isServiceRoleKeyProblem } = await import("../utils/dbHelpers");
      if (isServiceRoleKeyProblem(error)) {
        // Retry with anon client for read access
        const anonQuery = supabaseClient.from("expenses").select("*", { count: "exact" });
        if (category) anonQuery.eq("category", category);
        if (month) {
          anonQuery.gte("expense_date", `${year || new Date().getFullYear()}-${String(month).padStart(2, "0")}-01`);
          anonQuery.lte("expense_date", `${year || new Date().getFullYear()}-${String(month).padStart(2, "0")}-31`);
        }
        const anonRes = await anonQuery
          .order("expense_date", { ascending: false })
          .range(offset, offset + limitNum - 1)
          .limit(limitNum);
        expenses = anonRes.data || [];
        count = anonRes.count || 0;
        error = anonRes.error;
      }
    }

    if (error) {
      if (handleMissingTableError(res, error, "Expenses table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to fetch expenses", error.message, 500);
      return;
    }

    sendPaginated(
      res,
      expenses || [],
      pageNum,
      limitNum,
      count || 0,
      "Expenses fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch expenses", error.message, 500);
  }
};

export const updateExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { category, amount, description, expense_date } = req.body;

    if (!VALID_EXPENSE_CATEGORIES.includes(category)) {
      sendError(res, "Invalid expense category", undefined, 400);
      return;
    }

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      sendError(res, "Amount must be a positive number", undefined, 400);
      return;
    }

    // Try update with service-role first; fall back to anon client if service-role key problem
    let updateRes = await supabase
      .from("expenses")
      .update({
        category,
        amount: normalizedAmount,
        description,
        expense_date: expense_date || new Date().toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    let expense = updateRes.data;
    let error = updateRes.error;

    if (error) {
      const { isServiceRoleKeyProblem } = await import("../utils/dbHelpers");
      if (isServiceRoleKeyProblem(error)) {
        const anonRes = await supabaseClient
          .from("expenses")
          .update({
            category,
            amount: normalizedAmount,
            description,
            expense_date: expense_date || new Date().toISOString().split("T")[0],
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();
        expense = anonRes.data;
        error = anonRes.error;
      }
    }

    if (error) {
      if (handleMissingTableError(res, error, "Expense table is not available in the configured Supabase schema")) {
        return;
      }
      sendError(res, "Failed to update expense", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, expense, "Expense updated successfully");
  } catch (error: any) {
    sendError(res, "Failed to update expense", error.message, 500);
  }
};

export const getExpenseStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .select("category, amount", { count: "exact" });

    if (error) {
      sendError(res, "Failed to fetch expense stats", error.message, 500);
      return;
    }

    const stats = data?.reduce(
      (acc: any, item: any) => {
        if (!acc[item.category]) {
          acc[item.category] = 0;
        }
        acc[item.category] += Number(item.amount || 0);
        return acc;
      },
      {} as Record<string, number>
    );

    const total = Object.values(stats || {}).reduce((sum: number, value) => sum + Number(value || 0), 0);

    sendSuccess(
      res,
      {
        total,
        byCategory: stats || {},
      },
      "Expense statistics fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch expense stats", error.message, 500);
  }
};

export const deleteExpense = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Try delete with service-role first; fall back to anon client if service-role key unregistered
    let deleteRes = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    let error = deleteRes.error;

    if (error) {
      const { isServiceRoleKeyProblem } = await import("../utils/dbHelpers");
      if (isServiceRoleKeyProblem(error)) {
        const anonRes = await supabaseClient
          .from("expenses")
          .delete()
          .eq("id", id);
        error = anonRes.error;
      }
    }

    if (error) {
      if (handleMissingTableError(res, error, "Expenses table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to delete expense", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, null, "Expense deleted successfully");
  } catch (error: any) {
    sendError(res, "Failed to delete expense", error.message, 500);
  }
};
