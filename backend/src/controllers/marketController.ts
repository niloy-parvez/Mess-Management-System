import { Request, Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import { resolveRequesterId } from "../utils/auth";
import { handleMissingTableError, isMissingTableError } from "../utils/dbHelpers";

// Local in-memory market fallback removed for production. DEFAULT_MARKET_ITEMS retained as a helper list.

const DEFAULT_MARKET_ITEMS = [
  "Rice",
  "Oil",
  "Salt",
  "Sugar",
  "Onion",
  "Potato",
  "Fish",
  "Chicken",
  "Beef",
  "Egg",
  "Milk",
  "Vegetables",
  "Gas",
  "Others",
];

const normalizeMarketItems = (items: any[] = []) => {
  return items.map((item: any, index: number) => {
    const quantity = Number(item.quantity ?? item.qty ?? 0);
    const unitPrice = Number(item.price ?? item.unit_price ?? item.cost ?? 0);
    const totalPriceRaw = item.total_price != null ? Number(item.total_price) : quantity * unitPrice;
    const totalPrice = Number(totalPriceRaw.toFixed(2));

    return {
      name: String(item.name ?? item.item_name ?? item.item ?? "").trim(),
      quantity,
      unit: String(item.unit ?? item.uom ?? "kg").trim() || "kg",
      price: unitPrice,
      total_price: Number(totalPrice.toFixed(2)),
      item_index: index,
    };
  }).filter((item) => item.name && item.quantity > 0 && item.price >= 0);
};

const safeMoney = (value: number | string | undefined) => Number(Number(value || 0).toFixed(2));


const getMarketDateRange = (month: number, year: number) => {
  const normalizedMonth = Math.min(Math.max(month, 1), 12);
  const normalizedYear = year || new Date().getFullYear();
  const paddedMonth = String(normalizedMonth).padStart(2, "0");
  const daysInMonth = new Date(normalizedYear, normalizedMonth, 0).getDate();
  return {
    start: `${normalizedYear}-${paddedMonth}-01`,
    end: `${normalizedYear}-${paddedMonth}-${String(daysInMonth).padStart(2, "0")}`,
  };
};

const ensureMarketExists = (market: any | null | undefined, res: Response): market is Record<string, unknown> => {
  if (!market) {
    sendError(res, "Market item not found", undefined, 404);
    return false;
  }
  return true;
};

// The request identity may be backed by Supabase auth.users but the legacy public.users
// table may still be the actual reference source for foreign keys. Resolve the profile row
// id when available, otherwise fall back to the auth user id.

export const createMarket = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { items, description, receipt_url, market_date, total_cost } = req.body;

    const normalizedItems = normalizeMarketItems(Array.isArray(items) ? items : []);

    if (normalizedItems.length === 0) {
      sendError(res, "At least one market item is required", undefined, 400);
      return;
    }

    const validatedItems = normalizedItems.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price,
      total_price: item.total_price,
    }));

    if (validatedItems.some((item) => !item.name || item.quantity <= 0 || item.price <= 0)) {
      sendError(res, "Each market item must include a valid name, quantity, and price", undefined, 400);
      return;
    }

    const computedTotalCost = safeMoney(total_cost || validatedItems.reduce((sum, item) => sum + item.total_price, 0));

    const createdByResolved = resolveRequesterId(req);
    if (!createdByResolved) {
      sendError(
        res,
        "Cannot resolve authenticated user to a valid profile or auth user id.",
        undefined,
        400
      );
      return;
    }

    if (req.user?.role === "member" && !req.user?.memberId) {
      sendError(
        res,
        "Cannot create market entry because this account is not linked to a member profile.",
        undefined,
        403
      );
      return;
    }

    const { data: market, error } = await supabase
      .from("market")
      .insert([
        {
          items: validatedItems,
          total_cost: computedTotalCost,
          description: description || null,
          receipt_url: receipt_url || null,
          market_date: market_date || new Date().toISOString().split("T")[0],
          is_approved: false,
          created_by: createdByResolved,
        },
      ])
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
        return;
      }

      console.error("[Market] create error:", error);
      // If the error looks like a FK or created_by problem, provide a clear actionable message
      const errMsg = String(error?.message || "").toLowerCase();
      if (errMsg.includes("violates foreign key constraint") || errMsg.includes("null value in column \"created_by\"")) {
        sendError(
          res,
          "Failed to create market entry due to inconsistent auth/user mapping. Ensure your JWT corresponds to an existing auth.users record and that members/users tables are properly linked.",
          error.message,
          400
        );
        return;
      }

      sendError(res, "Failed to create market entry", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, market, "Market entry created successfully", 201);
  } catch (error: any) {
    sendError(res, "Failed to create market entry", error.message, 500);
  }
};

export const getMarketItems = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { page = 1, limit = 20, status, is_approved, search, month, year } = req.query;
  const pageNum = parseInt(page as string) || 1;
  const limitNum = parseInt(limit as string) || 20;
  const offset = (pageNum - 1) * limitNum;
  const searchTerm = String(search || "").trim().toLowerCase();
  const filterByMonth = typeof month !== "undefined";
  const filterYear = Number(year || new Date().getFullYear());

  try {
    let query = supabase.from("market").select("*", { count: "exact" });

    if (req.user?.role !== "admin") {
      query = query.eq("created_by", req.user?.id || "");
    }

    if (is_approved !== undefined) {
      query = query.eq("is_approved", String(is_approved) === "true");
    } else if (status === "approved") {
      query = query.eq("is_approved", true);
    } else if (status === "pending") {
      query = query.eq("is_approved", false);
    }

    if (filterByMonth) {
      const { start, end } = getMarketDateRange(Number(month), filterYear);
      query = query.gte("market_date", start).lte("market_date", end);
    }

    query = query.order("market_date", { ascending: false });

    const { data: allItems, error, count } = await query;
    if (error) {
      if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to fetch market items", error.message, 500);
      return;
    }

    const filteredItems = (allItems || []).filter((item: any) => {
      if (!searchTerm) {
        return true;
      }
      const haystack = `${item.description || ""} ${item.items?.map((entry: any) => entry.name).join(" ") || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const pagedItems = filteredItems.slice(offset, offset + limitNum).map((item: any) => ({
      ...item,
      status: item.is_approved ? "approved" : item.approved_by ? "rejected" : "pending",
    }));
    sendPaginated(
      res,
      pagedItems,
      pageNum,
      limitNum,
      filteredItems.length,
      "Market items fetched successfully"
    );
  } catch (error: any) {
    if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
      return;
    }
    sendError(res, "Failed to fetch market items", error.message, 500);
  }
};

export const approveMarketItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const approvedByResolved = resolveRequesterId(req);
    if (!approvedByResolved) {
      sendError(res, "Cannot resolve authenticated user for approval. Ensure token maps to a valid profile or auth user id.", undefined, 400);
      return;
    }

    const { data: market, error } = await supabase
      .from("market")
      .update({
        is_approved: true,
        approved_by: approvedByResolved,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to approve market item", error.message, 500);
      return;
    }

    if (!ensureMarketExists(market, res)) {
      return;
    }

    const marketItem = market as any;

    // After approval, create or update a matching expense and recalculate meal rate for the market month
    try {
      const marketId = marketItem.id;
      const marketDate = marketItem.market_date || new Date().toISOString().split("T")[0];
      const expenseDescription = `market:${marketId}`;

      const { data: existingExpense, error: expenseError } = await supabase
        .from("expenses")
        .select("id, amount")
        .eq("description", expenseDescription)
        .maybeSingle();

      if (expenseError) {
        throw expenseError;
      }

      const expensePayload = {
        category: "others",
        amount: safeMoney((marketItem as any).total_cost),
        description: expenseDescription,
        expense_date: marketDate,
        receipt_url: marketItem.receipt_url || null,
        created_by: approvedByResolved,
      };

      if (existingExpense) {
        await supabase
          .from("expenses")
          .update(expensePayload)
          .eq("id", existingExpense.id);
      } else {
        await supabase.from("expenses").insert([expensePayload]);
      }

      const marketDt = new Date(marketDate);
      const month = marketDt.getMonth() + 1;
      const year = marketDt.getFullYear();
      try {
        const summary = await (await import("./reportController")).calculateMealRateSummary(month, year);
        await supabase
          .from("meal_rates")
          .upsert(
            {
              month,
              year,
              rate_per_meal: summary.ratePerMeal,
              total_meals: summary.totalMeals,
              total_expenses: summary.totalExpenses,
              market_cost: summary.totalMarketCost,
              calculated_by: resolveRequesterId(req),
            },
            { onConflict: "month,year" }
          );

        // Also regenerate monthly bills for the affected month so member balances reflect the updated market/expense totals
        try {
          const { generateMonthlyBillsForMonth } = await import("./reportController");
          await generateMonthlyBillsForMonth(month, year, resolveRequesterId(req));
        } catch (e) {
          console.error('[Market] Failed to regenerate monthly bills after market approval:', (e as any)?.message || e);
        }
      } catch (e: any) {
        console.error("Failed to recalculate meal rate after market approval:", e?.message || e);
      }

      try {
        await (await import("../services/dashboardService")).invalidateCache();
      } catch (e) {
        /* ignore */
      }
    } catch (e: any) {
      console.error("Post-approval actions failed:", e?.message || e);
    }

    sendSuccess(res, market, "Market item approved successfully");
  } catch (error: any) {
    sendError(res, "Failed to approve market item", error.message, 500);
  }
};

export const rejectMarketItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const approvedByResolved = resolveRequesterId(req);
    if (!approvedByResolved) {
      sendError(res, "Cannot resolve authenticated user for rejection. Ensure token maps to a valid profile or auth user id.", undefined, 400);
      return;
    }

    const { data: market, error } = await supabase
      .from("market")
      .update({
        is_approved: false,
        approved_by: approvedByResolved,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to reject market item", error.message, 500);
      return;
    }

    if (!ensureMarketExists(market, res)) {
      return;
    }

    const marketItem = market as any;

    try {
      const marketId = marketItem.id;
      const marketDate = marketItem.market_date || new Date().toISOString().split("T")[0];
      const expenseDescription = `market:${marketId}`;

      const { error: deleteError } = await supabase.from("expenses").delete().eq("description", expenseDescription);
      if (deleteError && !isMissingTableError(deleteError)) {
        console.error("Failed to delete market-related expense on rejection:", deleteError.message || deleteError);
      }

      const marketDt = new Date(marketDate);
      const month = marketDt.getMonth() + 1;
      const year = marketDt.getFullYear();
      try {
        const summary = await (await import("./reportController")).calculateMealRateSummary(month, year);
        await supabase
          .from("meal_rates")
          .upsert(
            {
              month,
              year,
              rate_per_meal: summary.ratePerMeal,
              total_meals: summary.totalMeals,
              total_expenses: summary.totalExpenses,
              market_cost: summary.totalMarketCost,
              calculated_by: resolveRequesterId(req),
            },
            { onConflict: "month,year" }
          );

      // Also regenerate monthly bills for the affected month after market rejection change
      try {
        const { generateMonthlyBillsForMonth } = await import("./reportController");
        await generateMonthlyBillsForMonth(month, year, resolveRequesterId(req));
      } catch (e) {
        console.error('[Market] Failed to regenerate monthly bills after market rejection:', (e as any)?.message || e);
      }
      } catch (e: any) {
      console.error("Failed to recalculate meal rate after market rejection:", e?.message || e);
      }

      try {
        await (await import("../services/dashboardService")).invalidateCache();
      } catch (e) {
        /* ignore */
      }
    } catch (e: any) {
      console.error("Post-rejection actions failed:", e?.message || e);
    }

    sendSuccess(res, market, "Market item rejected successfully");
  } catch (error: any) {
    sendError(res, "Failed to reject market item", error.message, 500);
  }
};

export const deleteMarketItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: market, error: marketError } = await supabase
      .from("market")
      .select("id, market_date, is_approved")
      .eq("id", id)
      .maybeSingle();

    if (marketError) {
      if (handleMissingTableError(res, marketError, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to delete market item", marketError.message, 500);
      return;
    }

    if (!ensureMarketExists(market, res)) {
      return;
    }

    const marketItem = market as any;
    const { error } = await supabase
      .from("market")
      .delete()
      .eq("id", id);

    if (error) {
      if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to delete market item", error.message, 500);
      return;
    }

    if (marketItem.is_approved) {
      try {
        const expenseDescription = `market:${marketItem.id}`;
        const { error: deleteExpenseError } = await supabase.from("expenses").delete().eq("description", expenseDescription);
        if (deleteExpenseError && !isMissingTableError(deleteExpenseError)) {
          console.error("Failed to delete market-related expense on market deletion:", deleteExpenseError.message || deleteExpenseError);
        }

        const marketDt = new Date(marketItem.market_date || new Date().toISOString().split("T")[0]);
        const month = marketDt.getMonth() + 1;
        const year = marketDt.getFullYear();
        const summary = await (await import("./reportController")).calculateMealRateSummary(month, year);
        await supabase
          .from("meal_rates")
          .upsert(
            {
              month,
              year,
              rate_per_meal: summary.ratePerMeal,
              total_meals: summary.totalMeals,
              total_expenses: summary.totalExpenses,
              market_cost: summary.totalMarketCost,
              calculated_by: resolveRequesterId(req),
            },
            { onConflict: "month,year" }
          );

        // Regenerate monthly bills after market deletion so balances are consistent
        try {
          const { generateMonthlyBillsForMonth } = await import("./reportController");
          await generateMonthlyBillsForMonth(month, year, resolveRequesterId(req));
        } catch (e) {
          console.error('[Market] Failed to regenerate monthly bills after market deletion:', (e as any)?.message || e);
        }
      } catch (e: any) {
        console.error("Failed to recalculate meal rate after deleting market item:", e?.message || e);
      }
    }

    try {
      await (await import("../services/dashboardService")).invalidateCache();
    } catch (e) {
      /* ignore */
    }

    sendSuccess(res, null, "Market item deleted successfully");
  } catch (error: any) {
    sendError(res, "Failed to delete market item", error.message, 500);
  }
};

export const updateMarketItem = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { items, description, receipt_url, market_date, total_cost } = req.body;
    const normalizedItems = normalizeMarketItems(Array.isArray(items) ? items : []);

    if (normalizedItems.length === 0) {
      sendError(res, "At least one market item is required", undefined, 400);
      return;
    }

    const updatedPayload = {
      items: normalizedItems,
      total_cost: safeMoney(total_cost || normalizedItems.reduce((sum, item) => sum + item.total_price, 0)),
      description: description || null,
      receipt_url: receipt_url || null,
      market_date: market_date || new Date().toISOString().split("T")[0],
      updated_at: new Date().toISOString(),
    };

    const { data: existingMarket, error: fetchError } = await supabase
      .from("market")
      .select("id, is_approved, market_date, created_by")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      if (handleMissingTableError(res, fetchError, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to update market item", fetchError.message, 500);
      return;
    }

    if (!ensureMarketExists(existingMarket, res)) {
      return;
    }

    const marketItem = existingMarket as any;
    if (req.user?.role !== "admin" && marketItem.created_by !== req.user?.id) {
      sendError(res, "You can only update your own market entries", undefined, 403);
      return;
    }

    if (req.user?.role !== "admin" && marketItem.is_approved) {
      sendError(res, "Approved market entries cannot be modified by members", undefined, 403);
      return;
    }

    const { data: market, error } = await supabase
      .from("market")
      .update(updatedPayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error, "Market table missing in the Supabase schema")) {
        return;
      }
      sendError(res, "Failed to update market item", error.message, 500);
      return;
    }

    if (marketItem.is_approved) {
      try {
        const marketDate = updatedPayload.market_date || marketItem.market_date || new Date().toISOString().split("T")[0];
        const expenseDescription = `market:${id}`;
        const { data: existingExpense, error: expenseError } = await supabase
          .from("expenses")
          .select("id")
          .eq("description", expenseDescription)
          .maybeSingle();

        if (expenseError) {
          throw expenseError;
        }

        const expensePayload = {
          category: "others",
          amount: updatedPayload.total_cost,
          description: expenseDescription,
          expense_date: marketDate,
          receipt_url: updatedPayload.receipt_url,
          created_by: resolveRequesterId(req),
        };

        if (existingExpense) {
          await supabase.from("expenses").update(expensePayload).eq("id", existingExpense.id);
        } else {
          await supabase.from("expenses").insert([expensePayload]);
        }

        const marketDt = new Date(marketDate);
        const month = marketDt.getMonth() + 1;
        const year = marketDt.getFullYear();
        const summary = await (await import("./reportController")).calculateMealRateSummary(month, year);
        await supabase
          .from("meal_rates")
          .upsert(
            {
              month,
              year,
              rate_per_meal: summary.ratePerMeal,
              total_meals: summary.totalMeals,
              total_expenses: summary.totalExpenses,
              market_cost: summary.totalMarketCost,
              calculated_by: resolveRequesterId(req),
            },
            { onConflict: "month,year" }
          );
      } catch (e: any) {
        console.error("Failed to update market-related expense after market update:", e?.message || e);
      }
    }

    try {
      await (await import("../services/dashboardService")).invalidateCache();
    } catch (e) {
      /* ignore */
    }

    sendSuccess(res, market, "Market entry updated successfully");
  } catch (error: any) {
    sendError(res, "Failed to update market item", error.message, 500);
  }
};

export const getMarketStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const today = new Date().toISOString().split("T")[0];
    let query = supabase
      .from("market")
      .select("total_cost, market_date, created_by")
      .eq("is_approved", true);

    if (req.user?.role !== "admin") {
      query = query.eq("created_by", req.user?.id || "");
    }

    const { data: approvedEntries, error } = await query;

    if (error) {
      sendError(res, "Failed to fetch market stats", error.message, 500);
      return;
    }

    const totalApproved = approvedEntries?.reduce((sum, item) => sum + Number(item.total_cost || 0), 0) || 0;
    const todayCost = approvedEntries
      ?.filter((entry) => entry.market_date === today)
      .reduce((sum, item) => sum + Number(item.total_cost || 0), 0) || 0;

    sendSuccess(
      res,
      {
        totalApproved,
        todayCost,
        approvedCount: approvedEntries?.length || 0,
      },
      "Market stats fetched successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch market stats", error.message, 500);
  }
};
