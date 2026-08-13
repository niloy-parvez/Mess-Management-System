import supabase from '../src/config/supabase';

const memberId = process.argv[2] || '62ddeb7d-43f6-47e8-91e3-c2e61c17e2ff';

(async () => {
  try {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const monthStart = `${year}-${month}-01`;
    const monthEnd = `${year}-${month}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

    const [paymentsRes, totalPaidRes, monthlyBillRes, mealRateRes, monthlyMealsRes] = await Promise.all([
      supabase.from('payments').select('id, amount, payment_date, payment_method, verified, verified_by, created_at').eq('member_id', memberId).order('payment_date', { ascending: false }),
      supabase.from('payments').select('amount', { count: 'exact', head: false }).eq('member_id', memberId).eq('verified', true),
      supabase.from('monthly_bills').select('month,year,total_meals,meal_rate,total_cost,paid_amount,due_amount,status').eq('member_id', memberId).eq('month', parseInt(month)).eq('year', parseInt(year)).maybeSingle(),
      supabase.from('meal_rates').select('rate_per_meal,month,year').order('year', { ascending: false }).order('month', { ascending: false }).limit(1),
      supabase.from('meals').select('id', { count: 'exact', head: true }).eq('member_id', memberId).gte('meal_date', monthStart).lte('meal_date', monthEnd),
    ]);

    if (paymentsRes.error) throw paymentsRes.error;
    if (totalPaidRes.error) throw totalPaidRes.error;
    if (monthlyBillRes.error) throw monthlyBillRes.error;
    if (mealRateRes.error) throw mealRateRes.error;
    if (monthlyMealsRes.error) throw monthlyMealsRes.error;

    const payments = paymentsRes.data || [];
    const totalPaid = (payments || []).filter((p:any) => p.verified).reduce((s:number,p:any)=>s+Number(p.amount||0),0);
    const monthlyBill = monthlyBillRes.data || null;
    const mealCount = (monthlyMealsRes.count as number) || 0;
    const currentMealRate = (mealRateRes.data || [])[0]?.rate_per_meal || (monthlyBill ? monthlyBill.meal_rate : 0);
    const computedMonthlyBill = Number((mealCount * Number(currentMealRate || 0)).toFixed(2));

    console.log(JSON.stringify({ memberId, payments: payments.slice(0,10), totalPaid, monthlyBill, mealCount, currentMealRate, computedMonthlyBill }, null, 2));
  } catch (e:any) {
    console.error('ERR', e?.message || e);
    process.exit(1);
  }
})();
