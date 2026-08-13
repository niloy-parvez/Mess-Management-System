const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Supabase config missing');
  process.exit(2);
}

const supabase = createClient(url, serviceKey);

(async () => {
  try {
    const resp = await supabase.auth.admin.listUsers({ perPage: 100 });
    const users = resp?.data?.users || resp?.data || [];
    console.log('Total users:', users.length);
    users.forEach(u => console.log(u.email, u.id, JSON.stringify(u.user_metadata)));
  } catch (e) {
    console.error('Error listing users', e);
    process.exit(1);
  }
})();