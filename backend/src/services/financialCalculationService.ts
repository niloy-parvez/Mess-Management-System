import supabase from "../config/supabase";

const roundCurrency = (value: number): number => Number(Number(value || 0).toFixed(2));

const sumRows = (rows: any[] = [], key: string): number =>
  rows.reduce((sum, row) => sum + Number(row?.[key] ?? 0), 0);

export const getMonthRange = (month: number, year: number) => {
  const normalizedMonth = Math.min(Math.max(Number(month || 1), 1), 12);
  const normalizedYear = Number(year || new Date().getFullYear());
  const paddedMonth = String(normalizedMonth).padStart(2, "0");
  const lastDay = new Date(normalizedYear, normalizedMonth, 0).getDate();

  return {
    start: `${normalizedYear}-${paddedMonth}-01`,
    end: `${normalizedYear}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`,
  };
};

export const calculateMealRateSummary = async (month: number, year: number) => {
  const { start, end } = getMonthRange(month, year);

  const [marketResult, mealsResult] = await Promise.all([
    supabase
      .from("market")
      .select("total_cost")
      .eq("is_approved", true)
      .gte("market_date", start)
      .lte("market_date", end),
    supabase
      .from("meals")
      .select("id", { count: "exact", head: true })
      .gte("meal_date", start)
      .lte("meal_date", end),
  ]);

  const totalMarketCost = sumRows(marketResult.data || [], "total_cost");
  const totalMeals = mealsResult.count || 0;
  const ratePerMealExact = totalMeals > 0 ? totalMarketCost / totalMeals : 0;
  const ratePerMeal = roundCurrency(ratePerMealExact);

  return {
    totalApprovedMarketCost: roundCurrency(totalMarketCost),
    totalMarketCost: roundCurrency(totalMarketCost),
    totalMeals,
    ratePerMeal,
    ratePerMealExact,
    totalExpenses: 0,
    totalMonthlyCost: roundCurrency(totalMarketCost),
  };
};

export const calculateMonthlyCost = async (month: number, year: number) => {
  const summary = await calculateMealRateSummary(month, year);
  return {
    ...summary,
    monthlyCost: summary.totalMonthlyCost,
  };
};

export const calculateMemberMonthlyBill = async (memberId: string, month: number, year: number) => {
  const { start, end } = getMonthRange(month, year);
  const summary = await calculateMealRateSummary(month, year);

  const [{ count }, { data: payments }] = await Promise.all([
    supabase
      .from("meals")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId)
      .gte("meal_date", start)
      .lte("meal_date", end),
    supabase
      .from("payments")
      .select("amount")
      .eq("member_id", memberId)
      .eq("verified", true)
      .gte("payment_date", start)
      .lte("payment_date", end),
  ]);

  const mealCount = count || 0;
  const exactMealRate = summary.ratePerMealExact ?? summary.ratePerMeal;
  const bill = roundCurrency(mealCount * exactMealRate);
  const paid = (payments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netBalance = roundCurrency(paid - bill);
  const due = netBalance < 0 ? Math.abs(netBalance) : 0;

  return {
    memberId,
    month,
    year,
    mealCount,
    ratePerMeal: summary.ratePerMeal,
    bill,
    paid,
    due: roundCurrency(due),
    balance: roundCurrency(netBalance > 0 ? netBalance : 0),
    netBalance,
    status: netBalance > 0 ? "Balance / Credit" : netBalance < 0 ? "Due" : "Paid / Settled",
  };
};

export const calculateMemberBalance = async (memberId: string, month: number, year: number) => {
  const { start, end } = getMonthRange(month, year);
  const bill = await calculateMemberMonthlyBill(memberId, month, year);
  const { data: payments } = await supabase
    .from("payments")
    .select("amount")
    .eq("member_id", memberId)
    .eq("verified", true)
    .gte("payment_date", start)
    .lte("payment_date", end);

  const totalVerifiedPayments = (payments || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const netBalance = roundCurrency(totalVerifiedPayments - bill.bill);

  return {
    memberId,
    month,
    year,
    totalVerifiedPayments: roundCurrency(totalVerifiedPayments),
    bill: bill.bill,
    netBalance,
    due: netBalance < 0 ? Math.abs(netBalance) : 0,
    advance: netBalance > 0 ? netBalance : 0,
    status: netBalance > 0 ? "Advance / Credit" : netBalance < 0 ? "Due" : "Paid / Settled",
  };
};

export const calculateDashboardFinancials = async (month: number, year: number) => {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const { start, end } = getMonthRange(month, year);

  const [membersCount, todayMeals, monthMeals, monthlyExpenses, monthlyMarket, monthlyPayments, todayMarket, monthlyBills] = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("meals").select("id", { count: "exact", head: true }).eq("meal_date", today),
    supabase.from("meals").select("id", { count: "exact", head: true }).gte("meal_date", start).lte("meal_date", end),
    supabase.from("expenses").select("amount").gte("expense_date", start).lte("expense_date", end),
    supabase.from("market").select("total_cost, market_date, is_approved").eq("is_approved", true).gte("market_date", start).lte("market_date", end),
    supabase.from("payments").select("amount").eq("verified", true).gte("payment_date", start).lte("payment_date", end),
    supabase.from("market").select("total_cost").eq("is_approved", true).eq("market_date", today),
    supabase.from("monthly_bills").select("due_amount").eq("month", month).eq("year", year),
  ]);

  const summary = await calculateMealRateSummary(month, year);
  const monthlyExpenseTotal = (monthlyExpenses.data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const monthlyMarketTotal = (monthlyMarket.data || []).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const totalCollection = (monthlyPayments.data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const todayMarketCost = (todayMarket.data || []).reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const dueAmount = (monthlyBills.data || []).reduce((sum, item) => sum + Math.max(0, Number(item.due_amount || 0)), 0);

  return {
    totalMembers: membersCount.count || 0,
    activeMembers: membersCount.count || 0,
    todayMeals: todayMeals.count || 0,
    monthlyMeals: monthMeals.count || 0,
    totalExpenses: roundCurrency(monthlyExpenseTotal),
    totalMarketCost: roundCurrency(monthlyMarketTotal),
    totalCollection: roundCurrency(totalCollection),
    dueAmount: roundCurrency(dueAmount),
    todayMarketCost: roundCurrency(todayMarketCost),
    currentMealRate: summary.ratePerMeal,
    monthlyCost: summary.totalMonthlyCost,
    approvedMarketCost: summary.totalApprovedMarketCost,
  };
};

export const calculateReportFinancials = async (month: number, year: number) => {
  const summary = await calculateMealRateSummary(month, year);
  const { start, end } = getMonthRange(month, year);

  const [membersResult, paymentsResult, monthlyBillsResult] = await Promise.all([
    supabase.from("members").select("id, name, room_number, email, is_active"),
    supabase.from("payments").select("amount").eq("verified", true).gte("payment_date", start).lte("payment_date", end),
    supabase.from("monthly_bills").select("member_id, total_cost, paid_amount, due_amount, total_meals, meal_rate").eq("month", month).eq("year", year),
  ]);

  const totalCollection = (paymentsResult.data || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalDue = (monthlyBillsResult.data || []).reduce((sum, item) => sum + Math.max(0, Number(item.due_amount || 0)), 0);

  return {
    totalMembers: membersResult.data?.length || 0,
    totalMeals: summary.totalMeals,
    totalExpenses: 0,
    totalMarketCost: summary.totalMarketCost,
    totalCollection: roundCurrency(totalCollection),
    totalDue: roundCurrency(totalDue),
    currentMealRate: summary.ratePerMeal,
    monthlyCost: summary.totalMonthlyCost,
    members: membersResult.data || [],
  };
};
