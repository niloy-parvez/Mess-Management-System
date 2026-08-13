import supabase from '../src/config/supabase';

(async () => {
  try {
    const { data, error } = await supabase.from('members').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('ERROR', error.message || error);
      process.exit(1);
    }
    console.log(JSON.stringify(data, null, 2));
  } catch (e: any) {
    console.error(e?.message || e);
    process.exit(1);
  }
})();
