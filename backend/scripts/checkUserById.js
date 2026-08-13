const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) { console.error('supabase env missing'); process.exit(2); }
const supabase = createClient(url, serviceKey);
const id = process.argv[2];
if (!id) { console.error('Usage: node checkUserById.js <id>'); process.exit(2); }
(async () => {
  try {
    const resp = await supabase.auth.admin.getUserById(id);
    console.log(JSON.stringify(resp, null, 2));
  } catch (e) { console.error(e); process.exit(1); }
})();