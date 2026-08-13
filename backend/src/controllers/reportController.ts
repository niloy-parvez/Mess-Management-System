import { Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError } from "../utils/response";
import { handleMissingTableError } from "../utils/dbHelpers";
import { AuthRequest } from "../middlewares/auth";
import { calculateMealRateSummary as calculateUnifiedMealRateSummary } from "../services/financialCalculationService";

// Helper to resolve possible id forms to canonical auth.users id.
// Prefer the authenticated auth user id; keep a narrow compatibility lookup for legacy
// public.users and member identifiers only when the schema is still partially migrated.
const resolveAuthUserIdForReports = async (candidateId?: string | null): Promise<string | undefined> => {
  if (!candidateId) return undefined;
  try {
    const { data: authResult, error: authErr } = await supabase.auth.admin.getUserById(candidateId as string);
    if (!authErr && authResult && authResult.user) return authResult.user.id;
  } catch (e) {}
  try {
    const { data: publicUser, error: publicErr } = await supabase.from("users").select("auth_id").eq("id", candidateId).maybeSingle();
    if (!publicErr && publicUser && (publicUser as any).auth_id) return (publicUser as any).auth_id;
  } catch (e) {}
  try {
    const { data: memberRec, error: memberErr } = await supabase.from("members").select("user_id").eq("id", candidateId).maybeSingle();
    if (!memberErr && memberRec && (memberRec as any).user_id) return (memberRec as any).user_id;
  } catch (e) {}
  return undefined;
};

const getMonthRange = (month: number, year: number) => {
  const paddedMonth = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${paddedMonth}-01`,
    end: `${year}-${paddedMonth}-${String(daysInMonth).padStart(2, "0")}`,
  };
};

export const calculateMealRateSummary = async (month: number, year: number) => {
  return await calculateUnifiedMealRateSummary(month, year);
};

export const generateMonthlyBillsForMonth = async (month: number, year: number, calculatedBy?: string) => {
  const { data: mealRate, error: mealRateError } = await supabase
    .from("meal_rates")
    .select("rate_per_meal")
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  if (mealRateError || !mealRate) {
    throw new Error("Meal rate not found for the requested month. Generate it first.");
  }

  const { data: members } = await supabase.from("members").select("id, email, name").eq("is_active", true);
  const { start, end } = getMonthRange(month, year);

  const bills = await Promise.all(
    (members || []).map(async (member: any) => {
      const [{ count: totalMeals }, { data: payments }] = await Promise.all([
        supabase
          .from("meals")
          .select("id", { count: "exact", head: true })
          .eq("member_id", member.id)
          .gte("meal_date", start)
          .lte("meal_date", end),
        supabase
          .from("payments")
          .select("amount")
          .eq("member_id", member.id)
          .eq("verified", true)
          .gte("payment_date", start)
          .lte("payment_date", end),
      ]);

      const paidAmount = (payments || []).reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
      const mealCount = totalMeals || 0;
      const totalCost = Number((mealCount * Number(mealRate.rate_per_meal)).toFixed(2));
      const dueAmount = Number((totalCost - paidAmount).toFixed(2));
      // Some DB schemas enforce paid_amount <= total_cost; cap the stored paid amount to avoid constraint violations.
      const paidAmountToStore = Math.min(paidAmount, totalCost);

      return {
        member_id: member.id,
        month,
        year,
        total_meals: mealCount,
        meal_rate: mealRate.rate_per_meal,
        total_cost: totalCost,
        paid_amount: paidAmountToStore,
        // due_amount is often a generated/stored column in some schemas; omit explicit insertion
        status: dueAmount <= 0 ? "paid" : paidAmount > 0 ? "partial" : "pending",
        due_date: null,
        generated_by: calculatedBy || null,
      };
    })
  );

  const { data: insertedBills, error } = await supabase
    .from("monthly_bills")
    .upsert(bills, { onConflict: "member_id,month,year" })
    .select();

  if (error) {
    throw error;
  }

  return insertedBills || [];
};

const sumNumbers = (rows: any[], key: string) =>
  rows.reduce((sum, row) => sum + Number(row?.[key] || row?.amount || 0), 0);

const qs = (value: unknown) => String(value || "").trim().toLowerCase();

export const getReportsSummary = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = "", month, year } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const searchTerm = qs(search);

    const filterByMonth = typeof month !== "undefined" || typeof year !== "undefined";
    const currentYear = Number(year || new Date().getFullYear());
    const currentMonth = Number(month || new Date().getMonth() + 1);

    const today = new Date().toISOString().split("T")[0];
    const monthStart = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
    const monthEnd = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${new Date(currentYear, currentMonth, 0).getDate()}`;

    // Use centralized calculation for monthly totals when a month/year is provided
    let calculatedSummary: any = null;
    if (filterByMonth) {
      calculatedSummary = await calculateMealRateSummary(currentMonth, currentYear);
    }

    // Build queries with filters to avoid duplicate calculations and to ensure only approved records are used for market related sums
    const membersQuery = supabase.from("members").select("*", { count: "exact" }).order("created_at", { ascending: false });

    // Meals: if month/year provided, restrict to that range; otherwise fetch recent meals
    let mealsQuery = supabase.from("meals").select("*", { count: "exact" }).order("meal_date", { ascending: false });
    if (filterByMonth) {
      mealsQuery = mealsQuery.gte("meal_date", monthStart).lte("meal_date", monthEnd);
    }

    // Markets: only approved markets affect reports; restrict to range if provided
    let marketQuery = supabase.from("market").select("*", { count: "exact" }).eq("is_approved", true).order("market_date", { ascending: false });
    if (filterByMonth) {
      marketQuery = marketQuery.gte("market_date", monthStart).lte("market_date", monthEnd);
    }

    // Expenses: use available schema columns only (some deployments do not include market_id).
    let expensesQuery = supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .order("expense_date", { ascending: false });
    if (filterByMonth) {
      expensesQuery = expensesQuery.gte("expense_date", monthStart).lte("expense_date", monthEnd);
    }

    // Payments: consider only verified payments for collection totals
    let paymentsQuery = supabase.from("payments").select("*", { count: "exact" }).eq("verified", true).order("payment_date", { ascending: false });
    if (filterByMonth) {
      paymentsQuery = paymentsQuery.gte("payment_date", monthStart).lte("payment_date", monthEnd);
    }

    const [membersResult, mealsResult, marketResult, expensesResult, paymentsResult, billsResult, mealRateResult] = await Promise.all([
      membersQuery,
      mealsQuery,
      marketQuery,
      expensesQuery,
      paymentsQuery,
      supabase.from("monthly_bills").select("*", { count: "exact" }).order("year", { ascending: false }).order("month", { ascending: false }),
      supabase.from("meal_rates").select("*").order("year", { ascending: false }).order("month", { ascending: false }),
    ]);

      const queryErrors = [
        { result: membersResult, name: "members" },
        { result: mealsResult, name: "meals" },
        { result: marketResult, name: "market" },
        { result: expensesResult, name: "expenses" },
        { result: paymentsResult, name: "payments" },
        { result: billsResult, name: "monthly bills" },
        { result: mealRateResult, name: "meal rates" },
      ];

      for (const { result, name } of queryErrors) {
        if (result.error) {
          if (handleMissingTableError(res, result.error, `Required ${name} table missing in the Supabase schema`)) {
            return;
          }
          sendError(res, `Failed to fetch ${name} data for reports`, result.error.message, 500);
          return;
        }
      }

      const membersAll = (membersResult.data || []) as any[];

    // Apply search filtering in memory for now
    const members = membersAll.filter((member: any) => {
      if (!searchTerm) return true;
      const haystack = `${member.name || member.full_name || ""} ${member.email || ""} ${member.phone || ""} ${member.room_number || member.room || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const mealsAll = (mealsResult.data || []) as any[];
    const meals = mealsAll.filter((meal: any) => {
      if (!searchTerm) return true;
      const haystack = `${meal.meal_type || ""} ${meal.member_id || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const marketAll = (marketResult.data || []) as any[]; // already filtered to approved
    const market = marketAll.filter((entry: any) => {
      if (!searchTerm) return true;
      const items = (entry.items || []).map((item: any) => item.name).join(" ");
      const haystack = `${items} ${entry.description || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const expensesAll = (expensesResult.data || []) as any[]; // non-market expenses only
    const expenses = expensesAll.filter((expense: any) => {
      if (!searchTerm) return true;
      const haystack = `${expense.category || ""} ${expense.description || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const paymentsAll = (paymentsResult.data || []) as any[]; // verified payments only
    const payments = paymentsAll.filter((payment: any) => {
      if (!searchTerm) return true;
      const haystack = `${payment.payment_method || ""} ${payment.transaction_id || ""}`.toLowerCase();
      return haystack.includes(searchTerm);
    });

    const monthlyBills = (billsResult.data || []) as any[];

    // Use centralized summary when month filter provided to avoid duplicated calculation
    let totalExpenses = 0;
    let totalMarketCost = 0;
    let totalMeals = 0;
    let ratePerMeal = 0;

    if (filterByMonth && calculatedSummary) {
      totalExpenses = calculatedSummary.totalExpenses || 0;
      totalMarketCost = calculatedSummary.totalMarketCost || 0;
      totalMeals = calculatedSummary.totalMeals || 0;
      ratePerMeal = calculatedSummary.ratePerMeal || 0;
    } else {
      // Fallback: compute from query results (market already approved, payments verified)
      const otherExpensesSum = sumNumbers(expensesAll, "amount");
      const approvedMarketSum = marketAll.reduce((s, e) => s + Number(e.total_cost || 0), 0);
      totalExpenses = otherExpensesSum + approvedMarketSum;
      totalMarketCost = approvedMarketSum;
      totalMeals = mealsAll.length;
      ratePerMeal = ((totalMeals > 0) ? Number((totalExpenses / totalMeals).toFixed(2)) : 0);
    }

    const totalCollection = sumNumbers(paymentsAll, "amount");
    const totalDue = sumNumbers(monthlyBills, "due_amount");

    const todayMarketCost = marketAll.filter((entry: any) => entry.market_date === today).reduce((sum, entry) => sum + Number(entry.total_cost || 0), 0);
    const monthlyMarketCost = marketAll.filter((entry: any) => entry.market_date >= monthStart && entry.market_date <= monthEnd).reduce((sum, entry) => sum + Number(entry.total_cost || 0), 0);

    const reportSummary = {
      overview: {
        totalMembers: members.length,
        activeMembers: members.filter((member: any) => member.is_active).length,
        totalMeals,
        totalExpenses,
        totalCollection,
        totalDue,
        todayMarketCost,
        currentMealRate: ratePerMeal,
      },
      members: members.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      meals: meals.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      market: market.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      expenses: expenses.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      payments: payments.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      monthlyBills: monthlyBills.slice((pageNum - 1) * limitNum, pageNum * limitNum),
      monthlyMarketCost,
    };

    sendSuccess(res, reportSummary, "Reports summary fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch reports summary", error.message, 500);
  }
};

export const generateMealRate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.body;
    const normalizedMonth = Number(month);
    const normalizedYear = Number(year);

    if (!normalizedMonth || !normalizedYear) {
      sendError(res, "Month and year are required", undefined, 400);
      return;
    }

    const summary = await calculateMealRateSummary(normalizedMonth, normalizedYear);

    const { data: mealRate, error } = await supabase
      .from("meal_rates")
      .upsert(
        {
          month: normalizedMonth,
          year: normalizedYear,
          rate_per_meal: summary.ratePerMeal,
          total_meals: summary.totalMeals,
          total_expenses: summary.totalExpenses,
          market_cost: summary.totalMarketCost,
          calculated_by: req.user?.id,
        },
        { onConflict: "month,year" }
      )
      .select()
      .single();

    if (error) {
      sendError(res, "Failed to generate meal rate", error.message, 500);
      return;
    }

    sendSuccess(res, mealRate, "Meal rate generated successfully");
  } catch (error: any) {
    sendError(res, "Failed to generate meal rate", error.message, 500);
  }
};

export const getMealRate = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      sendError(res, "Month and year are required", undefined, 400);
      return;
    }

    const { data: mealRate, error } = await supabase
      .from("meal_rates")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .single();

    if (error || !mealRate) {
      sendError(res, "Meal rate not found", undefined, 404);
      return;
    }

    sendSuccess(res, mealRate, "Meal rate fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch meal rate", error.message, 500);
  }
};

export const generateMonthlyBills = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.body;
    const normalizedMonth = Number(month);
    const normalizedYear = Number(year);

    if (!normalizedMonth || !normalizedYear) {
      sendError(res, "Month and year are required", undefined, 400);
      return;
    }

    const resolvedCalcBy = await resolveAuthUserIdForReports(req.user?.id);
    const insertedBills = await generateMonthlyBillsForMonth(normalizedMonth, normalizedYear, resolvedCalcBy);
    sendSuccess(res, insertedBills, `Generated ${insertedBills.length} monthly bills`);
  } catch (error: any) {
    sendError(res, "Failed to generate monthly bills", error.message, 500);
  }
};

export const closeMonth = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { month, year } = req.body;
    const normalizedMonth = Number(month);
    const normalizedYear = Number(year);

    if (!normalizedMonth || !normalizedYear) {
      sendError(res, "Month and year are required", undefined, 400);
      return;
    }

    const summary = await calculateMealRateSummary(normalizedMonth, normalizedYear);
    const resolvedCalcBy = await resolveAuthUserIdForReports(req.user?.id);
    const mealRateUpsert = await supabase
      .from("meal_rates")
      .upsert(
        {
          month: normalizedMonth,
          year: normalizedYear,
          rate_per_meal: summary.ratePerMeal,
          total_meals: summary.totalMeals,
          total_expenses: summary.totalExpenses,
          market_cost: summary.totalMarketCost,
          calculated_by: resolvedCalcBy,
        },
        { onConflict: "month,year" }
      )
      .select()
      .single();

    if (mealRateUpsert.error) {
      sendError(res, "Failed to close month", mealRateUpsert.error.message, 500);
      return;
    }

    const { data: marketLock, error: marketLockError } = await supabase
      .from("market_locks")
      .upsert(
        {
          month: normalizedMonth,
          year: normalizedYear,
          created_by: resolvedCalcBy,
          notes: `Monthly closure for ${normalizedMonth}/${normalizedYear}`,
        },
        { onConflict: "month,year" }
      )
      .select()
      .single();

    if (marketLockError && marketLockError.code !== "23505") {
      sendError(res, "Failed to lock market month", marketLockError.message, 500);
      return;
    }

    const bills = await generateMonthlyBillsForMonth(normalizedMonth, normalizedYear, resolvedCalcBy);

    sendSuccess(
      res,
      {
        mealRate: mealRateUpsert.data,
        marketLock: marketLock || null,
        bills: bills.length,
        summary,
      },
      "Month closed successfully"
    );
  } catch (error: any) {
    sendError(res, "Failed to close month", error.message, 500);
  }
};

export const getMonthlyBill = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { memberId, month, year } = req.query;

    if (!memberId || !month || !year) {
      sendError(res, "Member ID, month, and year are required", undefined, 400);
      return;
    }

    const { data: bill, error } = await supabase
      .from("monthly_bills")
      .select("*")
      .eq("member_id", memberId)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (error || !bill) {
      sendError(res, "Bill not found", undefined, 404);
      return;
    }

    sendSuccess(res, bill, "Monthly bill fetched successfully");
  } catch (error: any) {
    sendError(res, "Failed to fetch monthly bill", error.message, 500);
  }
};

export const getMemberMonthlyBills = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { memberId, page = 1, limit = 12 } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 12;
    const offset = (pageNum - 1) * limitNum;

    if (!memberId) {
      sendError(res, "Member ID is required", undefined, 400);
      return;
    }

    const { data: bills, error, count } = await supabase
      .from("monthly_bills")
      .select("*", { count: "exact" })
      .eq("member_id", memberId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      sendError(res, "Failed to fetch bills", error.message, 500);
      return;
    }

    sendSuccess(
      res,
      bills || [],
      "Member bills fetched successfully",
      200
    );
  } catch (error: any) {
    sendError(res, "Failed to fetch bills", error.message, 500);
  }
};
