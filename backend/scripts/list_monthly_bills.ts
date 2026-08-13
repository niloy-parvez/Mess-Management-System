import supabase from '../src/config/supabase';

(async () => {
  try {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = prev.getMonth() + 1;
    const year = prev.getFullYear();

    const { data, error } = await supabase.from('monthly_bills').select('*').eq('month', month).eq('year', year);
    if (error) {
      console.error('ERR', error.message || error);
      process.exit(1);
    }
    console.log(JSON.stringify({ month, year, count: (data||[]).length, data: (data||[]).slice(0,50) }, null, 2));
  } catch (e:any) {
    console.error('ERR', e?.message || e);
  }
})();
