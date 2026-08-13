const supabaseModule = require('../src/config/supabase');
const supabase = supabaseModule.supabase || supabaseModule.default || supabaseModule;

(async () => {
  try {
    const payload = {
      items: [{ name: 'Rice', quantity: 5, unit: 'kg', price: 60, total_price: 300 }],
      total_cost: 300,
      description: 'Direct insert test',
      market_date: new Date().toISOString().split('T')[0],
      is_approved: false,
      created_by: '5f77047f-7381-41cb-b543-f1b61220d9a6'
    };

    const { data, error } = await supabase.from('market').insert([payload]).select().single();
    console.log('INSERT RESULT', { data, error });
  } catch (e) {
    console.error('EXCEPTION', e);
  }
})();
