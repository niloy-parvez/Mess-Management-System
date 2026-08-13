const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function run() {
  if (!SUPABASE_URL || !ANON_KEY) {
    console.error('[anon-diag] missing env');
    process.exit(1);
  }
  const client = createClient(SUPABASE_URL, ANON_KEY, { auth: { persistSession: false } });
  try {
    const { data, error, status } = await client.from('users').select('id, auth_id, email, role').limit(10);
    if (error) {
      console.error('[anon-diag] error', error.message, 'status', status);
    } else {
      console.log('[anon-diag] returned rows:', data.length);
      for (const r of data) console.log('- anon-sample:', r);
    }
  } catch (err) {
    console.error('[anon-diag] unexpected', err.message || err);
  }
}
run();
