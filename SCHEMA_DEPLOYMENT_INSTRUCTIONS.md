# 🚀 Supabase Schema Deployment Guide

**Status**: CRITICAL - Schema deployment required before system can function

**Time Required**: 5-10 minutes

---

## What's Blocking the System

The Supabase remote project at `uomrchkqnhigevietdsf.supabase.co` does NOT have the database schema deployed yet. This causes PGRST205 errors ("table not found") for all queries.

**Current Behavior**:
- ❌ Members table queries fail → fallback to auth users
- ❌ Meals table queries fail → fallback to local store
- ❌ Market table queries fail → fallback to local store
- ❌ Dashboard shows wrong member count (uses auth users instead)
- ❌ All data operations use in-memory fallback stores (lost on restart)

**After Deployment**:
- ✅ All 18 tables exist in Supabase
- ✅ All 67 RLS policies active
- ✅ Real data persistence
- ✅ Correct member counts
- ✅ Dashboard shows real data

---

## Option A: Supabase Web Editor (FASTEST - 5 min)

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Sign in with your account
3. Select project: **Mess Management** (uomrchkqnhigevietdsf)
4. Go to **SQL Editor** (left sidebar)

### Step 2: Deploy Tables & Triggers
1. Click **New Query**
2. Copy entire content from: `database/migrations/001_create_schema.sql`
3. Paste into SQL Editor
4. Click **RUN** (bottom right)
5. Wait for success message (30 seconds)
6. Check: Tables list should show 18 new tables

### Step 3: Enable RLS Policies
1. Click **New Query** again
2. Copy entire content from: `database/migrations/002_enable_rls.sql`
3. Paste and **RUN**
4. Wait for success (20 seconds)
5. Check: In **Auth** → **Policies**, should see 67 policies

### Step 4: Seed Test Data (Optional)
1. Click **New Query**
2. Copy entire content from: `database/migrations/003_seed_data.sql`
3. Paste and **RUN**
4. Test data (members, meals, market, expenses) now available

### Step 5: Verify Deployment
```bash
# In terminal, test member fetch:
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/members?limit=5

# Should return members array, NOT error
```

---

## Option B: PostgreSQL CLI (2 min)

If you have `psql` installed:

```bash
# Get your database URL from Supabase
# Dashboard → Settings → Database → Connection string (URI)

export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# Deploy schema
psql $DATABASE_URL -f database/migrations/001_create_schema.sql
psql $DATABASE_URL -f database/migrations/002_enable_rls.sql
psql $DATABASE_URL -f database/migrations/003_seed_data.sql

echo "✅ Schema deployed!"
```

---

## Option C: Node.js Migration Script

If you have Node.js installed:

```bash
cd backend

# Install dependencies (if not done)
npm install

# Deploy schema
node scripts/migrate.js up

# Verify
npm run test:schema
```

---

## Verification Checklist

After deployment, verify each step:

```bash
# 1. Check tables exist
curl http://localhost:5000/api/members?limit=1
# Should return: { success: true, data: [...], pagination: {...} }
# NOT: PGRST205 error

# 2. Check dashboard loads
curl http://localhost:5000/api/dashboard/stats
# Should return stats with real counts

# 3. Check meals work
curl -X POST http://localhost:5000/api/meals \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"member_id": "...", "meal_type": "breakfast", "meal_date": "2024-01-15"}'
# Should create meal, NOT error

# 4. Test in browser
# Go to http://localhost:3000
# Register new user
# Should see dashboard with members count > 0
# Should see members list populated
```

---

## Troubleshooting

### Error: "Already exists"
- Means schema already deployed ✅
- No action needed

### Error: "PGRST205 - table not found"
- Deployment incomplete
- Re-run 001_create_schema.sql

### Error: "permission denied"
- Check service role key in `.env`
- Must use SERVICE ROLE key, not ANON key

### Members showing as 0
- Check 001_create_schema.sql ran successfully
- Check 003_seed_data.sql ran to add test members

---

## Environment Check

Before deploying, verify `.env` configuration:

```bash
# backend/.env must have:
SUPABASE_URL=https://uomrchkqnhigevietdsf.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_7dhKhYZlFjGJRxwjK_HUIA_HDezkdbq
SUPABASE_ANON_KEY=sb_publishable_9dnwfGJZjiyz2nGa-sNauQ_Ch9Bompe

# Check (should print 3 keys):
grep "SUPABASE" backend/.env
```

---

## After Deployment

Once schema is deployed:

1. ✅ Backend will automatically use real tables
2. ✅ No code changes needed
3. ✅ Restart backend: `npm run dev`
4. ✅ Restart frontend: `npm run dev`
5. ✅ Test in browser: http://localhost:3000

---

## Support

If deployment fails:
1. Check Supabase dashboard for error messages
2. Verify SUPABASE_SERVICE_ROLE_KEY is correct
3. Try Option A (Web Editor) first - easiest to debug
4. Contact support with error message

**Time to production**: 5 minutes after schema deployment ✅
