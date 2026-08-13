const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

const id = process.argv[2];
if (!id) { console.error('Usage: node promoteUser.js <auth_user_id>'); process.exit(2); }

(async () => {
  try {
    const { data, error } = await supabase.from('users').update({ role: 'admin', is_active: true }).eq('auth_id', id).select().maybeSingle();
    if (error) { console.error('Update error', error); process.exit(1); }
    console.log('Updated profile:', data);
  } catch (e) { console.error(e); process.exit(1); }
})();