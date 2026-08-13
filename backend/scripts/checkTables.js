const dotenv = require('dotenv');
dotenv.config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');
const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, serviceKey);

async function check(table) {
  try {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.error(`TABLE ${table}: ERROR`, error.message || error);
    } else {
      console.log(`TABLE ${table}: EXISTS, sample rows:`, data.length);
    }
  } catch (e) {
    console.error(`TABLE ${table}: EXCEPTION`, e.message || e);
  }
}

(async () => {
  const tables = ['users','members','meals','market','expenses','payments','notifications'];
  for (const t of tables) {
    await check(t);
  }
})();