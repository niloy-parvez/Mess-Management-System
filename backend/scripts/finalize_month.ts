import { calculateMealRateSummary, generateMonthlyBillsForMonth } from '../src/controllers/reportController';
import supabase from '../src/config/supabase';

(async () => {
  try {
    const month = 7;
    const year = 2026;
    console.log('Calculating meal rate summary for', month, year);
    const summary = await calculateMealRateSummary(month, year);
    console.log('Summary:', summary);

    const up = await supabase.from('meal_rates').upsert({
      month,
      year,
      rate_per_meal: summary.ratePerMeal,
      total_meals: summary.totalMeals,
      total_expenses: summary.totalExpenses,
      market_cost: summary.totalMarketCost,
      calculated_by: null,
    }, { onConflict: 'month,year' }).select().single();

    console.log('Meal rate upsert:', up.error || up.data);

    const bills = await generateMonthlyBillsForMonth(month, year, undefined);
    console.log('Generated bills count:', bills.length);

    const { data: monthlyBills } = await supabase.from('monthly_bills').select('*').eq('month', month).eq('year', year);
    console.log('Monthly bills:', (monthlyBills||[]).length);
  } catch (e:any) {
    console.error('ERR', e?.message || e);
  }
})();
