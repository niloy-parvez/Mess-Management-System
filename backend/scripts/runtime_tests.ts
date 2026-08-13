import supabase from '../src/config/supabase';
import { calculateMealRateSummary } from '../src/controllers/reportController';

(async () => {
  try {
    const now = new Date('2026-08-13T21:23:30.072+06:00');
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonth = prev.getMonth() + 1;
    const prevYear = prev.getFullYear();

    console.log('Current date:', now.toISOString());
    console.log('Testing Current Month:', currentMonth, currentYear);
    console.log('Testing Previous Month:', prevMonth, prevYear);

    // Dashboard collection totals
    const { data: verifiedPayments, error: vpErr } = await supabase
      .from('payments')
      .select('amount', { head: false })
      .eq('verified', true);
    if (vpErr) throw vpErr;
    const totalCollection = (verifiedPayments || []).reduce((s:any,p:any)=>s+Number(p.amount||0),0);

    const { data: pendingPayments } = await supabase.from('payments').select('id,member_id,amount,verified,payment_date').eq('verified', false);

    console.log('Total Collection (verified payments only):', totalCollection);
    console.log('Pending payments count:', (pendingPayments||[]).length);

    // Month-specific sums
    const monthStr = String(prevMonth).padStart(2,'0');
    const monthStart = `${prevYear}-${monthStr}-01`;
    const monthEnd = `${prevYear}-${monthStr}-${new Date(prevYear, prevMonth, 0).getDate()}`;

    const pmPayments = await supabase.from('payments').select('id,amount,member_id,verified,payment_date').gte('payment_date', monthStart).lte('payment_date', monthEnd);
    const verifiedPm = (pmPayments.data||[]).filter((p:any)=>p.verified).reduce((s:any,p:any)=>s+Number(p.amount||0),0);
    const pendingPm = (pmPayments.data||[]).filter((p:any)=>!p.verified).reduce((s:any,p:any)=>s+Number(p.amount||0),0);
    console.log(`Previous month (${prevMonth}/${prevYear}) verified sum:`, verifiedPm, 'pending sum:', pendingPm);

    // Meal rate summary for prev and current
    const prevSummary = await calculateMealRateSummary(prevMonth, prevYear);
    const curSummary = await calculateMealRateSummary(currentMonth, currentYear);
    console.log('Prev summary:', prevSummary);
    console.log('Curr summary:', curSummary);

    // Find members named niloy
    const { data: members } = await supabase.from('members').select('*').ilike('name','%niloy%');
    console.log('Members matching niloy:', (members||[]).map((m:any)=>({id:m.id,name:m.name})));

    for (const m of (members||[])) {
      const { data: bill } = await supabase.from('monthly_bills').select('*').eq('member_id', m.id).eq('month', currentMonth).eq('year', currentYear).maybeSingle();
      const { data: billPrev } = await supabase.from('monthly_bills').select('*').eq('member_id', m.id).eq('month', prevMonth).eq('year', prevYear).maybeSingle();
      const paymentsAll = await supabase.from('payments').select('id,amount,verified,payment_date').eq('member_id', m.id);
      const verifiedThisMonth = await supabase.from('payments').select('amount').eq('member_id', m.id).eq('verified', true).gte('payment_date', monthStart).lte('payment_date', monthEnd);
      const verifiedSumThisMonth = (verifiedThisMonth.data||[]).reduce((s:any,p:any)=>s+Number(p.amount||0),0);
      console.log('Member:', m.name, m.id);
      console.log('  payments(total):', (paymentsAll.data||[]).slice(0,5));
      console.log('  verified sum prev month (for member):', verifiedSumThisMonth);
      console.log('  monthly_bill current:', bill);
      console.log('  monthly_bill prev:', billPrev);
    }

    console.log('Runtime tests completed');
  } catch (e:any) {
    console.error('ERR', e?.message || e);
    process.exit(1);
  }
})();
