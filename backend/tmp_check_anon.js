const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: __dirname + '/.env' });
const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;
if (!url || !anon) { console.error('missing env'); process.exit(2); }
const sb = createClient(url, anon);
(async () => {
  try {
    const res = await sb.from('expenses').select('*').limit(1);
    if (res.error) {
      console.error('ERROR', res.error.message);
    } else {
      console.log('ROWS', res.data ? res.data.length : 0);
    }
  } catch (e) {
    console.error('EX', e.message || e);
  }
})();