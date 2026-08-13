import { Request, Response } from "express";
import supabase from "../config/supabase";
import { sendSuccess, sendError, sendPaginated } from "../utils/response";
import { AuthRequest } from "../middlewares/auth";
import {
  handleMissingTableError,
  normalizePagination,
} from "../utils/dbHelpers";
import { toIsoDate } from "../utils/dateHelpers";

// Local in-memory fallback removed for production. Ensure the members table exists in Supabase and RLS/policies allow required access.

export const createMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { email, full_name, phone, room_number, join_date, notes } = req.body;

    if (!email || !full_name || !room_number) {
      sendError(res, "Name, email, and room number are required", undefined, 400);
      return;
    }

    const joinDate = toIsoDate(join_date);
    const { data: member, error } = await supabase
      .from("members")
      .insert([
        {
          email: email.toLowerCase().trim(),
          name: full_name.trim(),
          phone: phone || null,
          room_number,
          join_date: joinDate,
          notes: notes || null,
          is_active: true,
        },
      ])
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to create member", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, member, "Member created successfully", 201);
  } catch (error: any) {
    sendError(res, "Failed to create member", error.message, 500);
  }
};

export const getAllMembers = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  const { page, limit } = req.query;
  const { page: pageNum, limit: limitNum, offset } = normalizePagination(page, limit, 10);

  try {
    const { is_active } = req.query;
    const search = ((req.query.search as string) || (req.query.q as string) || "").trim();
    let query = supabase.from("members").select("*", { count: "exact" });

    if (req.user?.role !== "admin") {
      if (!req.user?.memberId) {
        sendError(res, "Member profile is not linked to this user", undefined, 403);
        return;
      }
      query = query.eq("id", req.user.memberId);
    }

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active === "true");
    }

    if (search) {
      const normalizedSearch = `%${search.toLowerCase()}%`;
      query = query.or(
        `name.ilike.${normalizedSearch},email.ilike.${normalizedSearch},room_number.ilike.${normalizedSearch},phone.ilike.${normalizedSearch}`
      );
    }

    const { data: members, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to fetch members", error.message, 500);
      return;
    }

    sendPaginated(
      res,
      members || [],
      pageNum,
      limitNum,
      count || 0,
      "Members fetched successfully"
    );
  } catch (error: any) {
    if (handleMissingTableError(res, error)) {
      return;
    }
    sendError(res, "Failed to fetch members", error.message, 500);
  }
};

export const getMemberById = async (
  req: AuthRequest,
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
        sendError(res, "You can only access your own member profile", undefined, 403);
        return;
      }
    }

    const { data: member, error } = await supabase
      .from("members")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }

      sendError(res, "Member not found", undefined, 404);
      return;
    }

    if (!member) {
      sendError(res, "Member not found", undefined, 404);
      return;
    }

    // Build member profile aggregates
    try {
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Determine which month/year to display for member summary
      // Members see the previous month's finalized calculation only after the 5th of the current month
      let targetMonthNum: number;
      let targetYearNum: number;
      let memberViewFinalized = false;

      const reqMonth = req.query.month ? parseInt(String(req.query.month)) : undefined;
      const reqYear = req.query.year ? parseInt(String(req.query.year)) : undefined;

      if (req.user?.role === "admin") {
        // Admin: allow explicit month/year or default to current month
        if (reqMonth && reqYear) {
          targetMonthNum = reqMonth;
          targetYearNum = reqYear;
          memberViewFinalized = true; // admin can view finalized or not
        } else {
          targetMonthNum = now.getMonth() + 1;
          targetYearNum = now.getFullYear();
          memberViewFinalized = false;
        }
      } else {
        // Member: show previous month's finalized calculation only after 5th
        const dayOfMonth = now.getDate();
        if (reqMonth && reqYear) {
          targetMonthNum = reqMonth;
          targetYearNum = reqYear;
          // If requested month is strictly before current month, consider it finalized if market lock exists
          memberViewFinalized = true;
        } else if (dayOfMonth > 5) {
          const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          targetMonthNum = prev.getMonth() + 1;
          targetYearNum = prev.getFullYear();
          memberViewFinalized = true;
        } else {
          // Before or on 5th: do not show previous month as finalized
          const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          targetMonthNum = prev.getMonth() + 1;
          targetYearNum = prev.getFullYear();
          memberViewFinalized = false;
        }
      }

      const monthStr = String(targetMonthNum).padStart(2, "0");
      const yearStr = String(targetYearNum);
      const monthStart = `${yearStr}-${monthStr}-01`;
      const monthEnd = `${yearStr}-${monthStr}-${new Date(targetYearNum, targetMonthNum, 0).getDate()}`;

      const [todaysMealsRes, totalMealsRes, monthlyMealsRes, mealHistoryRes, paymentsRes, totalPaidRes, monthlyBillRes] = await Promise.all([
        supabase.from("meals").select("id, meal_type, meal_date, created_at").eq("member_id", id).eq("meal_date", today),
        supabase.from("meals").select("id", { count: "exact", head: true }).eq("member_id", id),
        supabase.from("meals").select("id", { count: "exact", head: true }).eq("member_id", id).gte("meal_date", monthStart).lte("meal_date", monthEnd),
        supabase.from("meals").select("id, meal_type, meal_date, created_at").eq("member_id", id).order("meal_date", { ascending: false }).limit(50),
        supabase.from("payments").select("id, amount, payment_date, payment_method, verified, verified_by, created_at").eq("member_id", id).order("payment_date", { ascending: false }),
        supabase.from("payments").select("amount", { count: "exact", head: false }).eq("member_id", id).eq("verified", true).gte("payment_date", monthStart).lte("payment_date", monthEnd),
        supabase.from("monthly_bills").select("month,year,total_meals,meal_rate,total_cost,paid_amount,due_amount,status").eq("member_id", id).eq("month", targetMonthNum).eq("year", targetYearNum).maybeSingle(),
      ]);

      // Handle table missing errors
      const possibleErrors = [todaysMealsRes, totalMealsRes, monthlyMealsRes, mealHistoryRes, paymentsRes, totalPaidRes, monthlyBillRes];
      for (const r of possibleErrors) {
        if (r && (r as any).error) {
          if (handleMissingTableError(res, (r as any).error)) return;
        }
      }

      const todaysMeals = (todaysMealsRes.data || []) as any[];
      const totalMeals = (totalMealsRes.count as number) || 0;
      const monthlyMeals = (monthlyMealsRes.count as number) || 0;
      const mealHistory = (mealHistoryRes.data || []) as any[];
      const payments = (paymentsRes.data || []) as any[];
      const totalPaid = (payments || []).filter(p => p.verified).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const paymentDates = (payments || []).map(p => p.payment_date).filter(Boolean);
      const monthlyBill = (monthlyBillRes.data || null) as any | null;

      // Determine authoritative meal rate for this member and month/year
      let currentMealRate = 0;
      // totalVerifiedPaidForMonth: use totalPaidRes which queried verified payments within month range
      const totalVerifiedPaymentsForMonth = (totalPaidRes.data || []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

      if (monthlyBill) {
        currentMealRate = Number(monthlyBill.meal_rate || 0);
      } else {
        if (req.user?.role === "admin") {
          // Admin: compute provisional meal rate using authoritative function
          try {
            const summary = await (await import("./reportController")).calculateMealRateSummary(targetMonthNum, targetYearNum);
            currentMealRate = Number(summary.ratePerMeal || 0);
          } catch (e) {
            currentMealRate = 0;
          }
        } else {
          // Member and no monthly bill: do not assume latest meal rate; leave 0 and signal not finalized
          currentMealRate = 0;
        }
      }

      const totalDue = monthlyBill ? Number(monthlyBill.due_amount || 0) : 0;

      const monthlySummary: any = {};

      if (monthlyBill) {
        const storedPaidAmount = Number(monthlyBill.paid_amount || 0);
        const totalCost = Number(monthlyBill.total_cost || 0);
        // Use verified payments as authoritative for display and balance calculation
        const verifiedPaid = Number(totalVerifiedPaymentsForMonth || 0);
        const dueAmount = Math.max(0, Number((totalCost - verifiedPaid).toFixed(2)));
        const balance = Math.max(0, Number((verifiedPaid - totalCost).toFixed(2)));

        monthlySummary.finalized = true;
        monthlySummary.month = targetMonthNum;
        monthlySummary.year = targetYearNum;
        monthlySummary.meal_rate = Number(monthlyBill.meal_rate || 0);
        monthlySummary.monthly_meals = Number(monthlyBill.total_meals || 0);
        monthlySummary.monthly_bill = totalCost;
        monthlySummary.paid_amount = verifiedPaid; // show actual verified payments
        monthlySummary.due_amount = dueAmount;
        monthlySummary.balance = balance;
        monthlySummary.status = verifiedPaid >= totalCost ? (balance > 0 ? "credit" : "paid") : (verifiedPaid > 0 ? "partial" : "pending");
      } else {
        if (req.user?.role === "admin") {
          // Admin sees provisional computed values
          const provisionalTotalCost = Number((monthlyMeals * Number(currentMealRate || 0)).toFixed(2));
          const paid = Number(totalVerifiedPaymentsForMonth || 0);
          const due = Math.max(0, Number((provisionalTotalCost - paid).toFixed(2)));
          const balance = Math.max(0, Number((paid - provisionalTotalCost).toFixed(2)));

          monthlySummary.finalized = false;
          monthlySummary.provisional = true;
          monthlySummary.month = targetMonthNum;
          monthlySummary.year = targetYearNum;
          monthlySummary.meal_rate = currentMealRate;
          monthlySummary.monthly_meals = monthlyMeals;
          monthlySummary.monthly_bill = provisionalTotalCost;
          monthlySummary.paid_amount = paid;
          monthlySummary.due_amount = due;
          monthlySummary.balance = balance;
          monthlySummary.status = due <= 0 ? (balance > 0 ? "credit" : "paid") : (paid > 0 ? "partial" : "pending");
        } else {
          // Member: only show finalized previous-month data after the 5th; otherwise indicate not finalized
          if (memberViewFinalized) {
            // Attempt to auto-generate finalized records if they are missing and today is after 5th
            try {
              const { calculateMealRateSummary, generateMonthlyBillsForMonth } = await import("./reportController");
              // Generate meal rate and monthly bills idempotently
              const summary = await calculateMealRateSummary(targetMonthNum, targetYearNum);
              await supabase
                .from("meal_rates")
                .upsert(
                  {
                    month: targetMonthNum,
                    year: targetYearNum,
                    rate_per_meal: summary.ratePerMeal,
                    total_meals: summary.totalMeals,
                    total_expenses: summary.totalExpenses,
                    market_cost: summary.totalMarketCost,
                    calculated_by: req.user?.id || null,
                  },
                  { onConflict: "month,year" }
                );

              await generateMonthlyBillsForMonth(targetMonthNum, targetYearNum, req.user?.id || undefined);

              // Re-fetch the monthly bill for this member
              const { data: refreshedBill } = await supabase
                .from("monthly_bills")
                .select("month,year,total_meals,meal_rate,total_cost,paid_amount,due_amount,status")
                .eq("member_id", id)
                .eq("month", targetMonthNum)
                .eq("year", targetYearNum)
                .maybeSingle();

              if (refreshedBill) {
                const paidAmount = Number(refreshedBill.paid_amount || 0);
                const totalCost = Number(refreshedBill.total_cost || 0);
                const dueAmount = Number(refreshedBill.due_amount || 0);
                const balance = paidAmount > totalCost ? Number((paidAmount - totalCost).toFixed(2)) : 0;

                monthlySummary.finalized = true;
                monthlySummary.month = targetMonthNum;
                monthlySummary.year = targetYearNum;
                monthlySummary.meal_rate = Number(refreshedBill.meal_rate || 0);
                monthlySummary.monthly_meals = Number(refreshedBill.total_meals || 0);
                monthlySummary.monthly_bill = totalCost;
                monthlySummary.paid_amount = paidAmount;
                monthlySummary.due_amount = dueAmount;
                monthlySummary.balance = balance;
                monthlySummary.status = refreshedBill.status || (dueAmount <= 0 ? "paid" : (paidAmount > 0 ? "partial" : "pending"));
              } else {
                monthlySummary.finalized = false;
                monthlySummary.message = "Monthly calculation not finalized yet";
                monthlySummary.month = targetMonthNum;
                monthlySummary.year = targetYearNum;
              }
            } catch (e) {
              // If auto-generation fails, do not expose zeros; just inform the member
              monthlySummary.finalized = false;
              monthlySummary.message = "Monthly calculation not finalized yet";
              monthlySummary.month = targetMonthNum;
              monthlySummary.year = targetYearNum;
            }
          } else {
            monthlySummary.finalized = false;
            monthlySummary.message = "Previous month calculation will be available after the 5th";
            monthlySummary.month = targetMonthNum;
            monthlySummary.year = targetYearNum;
          }
        }
      }

      const profile = {
        basic: {
          name: member.name,
          phone: member.phone,
          room_number: member.room_number,
          status: member.is_active ? "active" : "inactive",
          join_date: member.join_date,
        },
        meals: {
          todays_meals: todaysMeals,
          todays_meal_count: todaysMeals.length,
          current_meal_status: todaysMeals.length > 0 ? "marked" : "not_marked",
          total_meals: totalMeals,
          monthly_meals: monthlyMeals,
          meal_history: mealHistory,
          meal_on_off_history: [], // No explicit meal-off table exists; leave empty when table absent
        },
        payments: {
          total_paid: Number(totalPaid || 0),
          total_due: Number(totalDue || 0),
          payment_history: payments,
          payment_dates: paymentDates,
        },
        monthly_summary: monthlySummary,
      };

      sendSuccess(res, { member, profile }, "Member fetched successfully");
    } catch (err: any) {
      sendError(res, "Failed to build member profile", err?.message || String(err), 500);
    }
  } catch (error: any) {
    sendError(res, "Failed to fetch member", error.message, 500);
  }
};

export const updateMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data: member, error } = await supabase
      .from("members")
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to update member", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, member, "Member updated successfully");
  } catch (error: any) {
    sendError(res, "Failed to update member", error.message, 500);
  }
};

export const deactivateMember = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

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
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to deactivate member", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, member, "Member deactivated successfully");
  } catch (error: any) {
    sendError(res, "Failed to deactivate member", error.message, 500);
  }
};

export const activateMember = async (
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
      if (handleMissingTableError(res, error)) {
        return;
      }
      sendError(res, "Failed to activate member", error.message, 500);
      return;
    }

    try { await (await import("../services/dashboardService")).invalidateCache(); } catch (e) { /* ignore */ }
    sendSuccess(res, member, "Member activated successfully");
  } catch (error: any) {
    sendError(res, "Failed to activate member", error.message, 500);
  }
};


