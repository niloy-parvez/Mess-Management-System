const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function run() {
  if (!SUPABASE_URL) {
    console.error('[diag] SUPABASE_URL missing');
    process.exit(1);
  }
  if (!SERVICE_ROLE) {
    console.error('[diag] SUPABASE_SERVICE_ROLE_KEY missing');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  console.log('[diag] Supabase URL host:', (new URL(SUPABASE_URL)).host);

  try {
    console.log('[diag] Listing first 50 auth.users (id, email, created_at, user_metadata.role)');
    const list = await supabase.auth.admin.listUsers({ perPage: 50 });
    if (list.error) {
      console.error('[diag] admin.listUsers error:', list.error.message);
    } else {
      const users = list.data.users || [];
      console.log('[diag] auth.users count returned:', users.length);
      for (const u of users) {
        const id = u.id;
        const email = u.email || (u.user_metadata && u.user_metadata.email) || null;
        const metaRole = (u.user_metadata && u.user_metadata.role) || null;
        console.log(`- auth.user: id=${id} email=${email} meta.role=${metaRole}`);

        // lookup public.users by auth_id
        const { data: profiles, error: pErr } = await supabase
          .from('users')
          .select('id, auth_id, email, name, role, is_active, created_at')
          .eq('auth_id', id);
        if (pErr) {
          console.error('[diag] public.users lookup error for auth_id=', id, pErr.message);
        } else if (!profiles || profiles.length === 0) {
          console.log(`  -> public.users profileFound=false`);
        } else {
          for (const prof of profiles) {
            console.log(`  -> public.users id=${prof.id} auth_id=${prof.auth_id} email=${prof.email} role=${prof.role} is_active=${prof.is_active}`);
          }
          if (profiles.length > 1) console.log('  -> WARNING: multiple public.users rows for this auth_id');
        }
      }
    }

    // Additional checks
    console.log('\n[diag] Checking public.users rows with NULL auth_id (legacy rows)');
    const { data: nullAuth, error: nullErr } = await supabase
      .from('users')
      .select('id, email, name, role, is_active, created_at')
      .is('auth_id', null)
      .order('created_at', { ascending: false })
      .limit(20);
    if (nullErr) {
      console.error('[diag] error querying null-auth rows:', nullErr.message);
    } else {
      console.log('[diag] public.users rows with null auth_id count:', (nullAuth && nullAuth.length) || 0);
      for (const r of (nullAuth || [])) {
        console.log(`- id=${r.id} email=${r.email} role=${r.role} created_at=${r.created_at}`);
      }
    }

    console.log('\n[diag] Checking total public.users count (safe sample)');
    const { data: totalSample, error: totErr } = await supabase
      .from('users')
      .select('id, auth_id, email, role')
      .order('created_at', { ascending: false })
      .limit(50);
    if (totErr) {
      console.error('[diag] public.users sample error:', totErr.message);
    } else {
      console.log('[diag] public.users sample rows:', (totalSample && totalSample.length) || 0);
      // print summary counts
      const authIdCount = (totalSample || []).filter(r => r.auth_id).length;
      console.log(`[diag] sample has ${authIdCount}/${(totalSample||[]).length} rows with auth_id set`);
    }

  } catch (err) {
    console.error('[diag] unexpected error', err.message || err);
  }
}

run();
