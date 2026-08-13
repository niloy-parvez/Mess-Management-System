import supabase from '../src/config/supabase';

(async ()=>{
  const memberId = process.argv[2] || '62ddeb7d-43f6-47e8-91e3-c2e61c17e2ff';
  const month = 7; const year = 2026;
  const { data, error } = await supabase.from('monthly_bills').select('*').eq('member_id', memberId).eq('month', month).eq('year', year).maybeSingle();
  if (error) console.error('ERR', error);
  console.log(JSON.stringify({ memberId, month, year, bill: data }, null, 2));
})();