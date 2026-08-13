import supabase from "../config/supabase";
import { calculateDashboardFinancials } from "./financialCalculationService";

// Centralized dashboard service that always reads real DB values.
// Avoids duplicated queries throughout controllers. No caching to guarantee realtime values.

export const fetchDashboardStats = async () => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  return await calculateDashboardFinancials(month, year);
};

export const fetchRecentActivities = async (limit = 10) => {
  const limitNum = Number(limit) || 10;

  const [recentMealsRes, recentPaymentsRes, recentMarketRes] = await Promise.all([
    supabase.from("meals").select("id, member_id, meal_type, meal_date, created_at, member:members(id, name)").order("created_at", { ascending: false }).limit(Math.floor(limitNum / 3)),
    supabase.from("payments").select("id, member_id, amount, payment_date, created_at, member:members(id, name)").order("created_at", { ascending: false }).limit(Math.floor(limitNum / 3)),
    supabase.from("market").select("id, total_cost, market_date, created_at").order("created_at", { ascending: false }).limit(Math.floor(limitNum / 3)),
  ]);

  const recentMeals = recentMealsRes.error ? [] : recentMealsRes.data || [];
  const recentPayments = recentPaymentsRes.error ? [] : recentPaymentsRes.data || [];
  const recentMarket = recentMarketRes.error ? [] : recentMarketRes.data || [];

  const activities = [
    ...(recentMeals.map((meal: any) => ({ type: "meal", description: `Meal marked: ${meal.meal_type} by ${meal.member?.full_name || meal.member?.name || "Member"}`, ...meal })) || []),
    ...(recentPayments.map((payment: any) => ({ type: "payment", description: `Payment received: ৳${payment.amount} by ${payment.member?.full_name || payment.member?.name || "Member"}`, ...payment })) || []),
    ...(recentMarket.map((market: any) => ({ type: "market", description: `Market activity: ৳${market.total_cost} spent`, ...market })) || []),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limitNum);

  return activities;
};

export const invalidateCache = async (): Promise<void> => {
  // Intentionally left blank to keep dashboard always reading DB.
  // This function exists so controllers can signal that data changed and
  // future implementations (e.g., caching) can react to it.
  return;
};

export default {
  fetchDashboardStats,
  fetchRecentActivities,
  invalidateCache,
};
