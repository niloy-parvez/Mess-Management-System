require('dotenv').config({ path: __dirname + '/.env' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
(async () => {
  try {
    const r = await sb.from('users').select('id,auth_id,email,role,is_active').limit(5);
    if (r.error) { console.error('ERR', r.error.message); process.exit(1); }
    console.log('USERS', JSON.stringify(r.data));
  } catch (e) { console.error('EX', e.message || e); }
})();