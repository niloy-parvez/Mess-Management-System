# Supabase Setup Guide
## Mess Management System v1.1.0

This guide walks you through setting up Supabase for the Mess Management System.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Supabase Project](#create-supabase-project)
3. [Configure Authentication](#configure-authentication)
4. [Apply Database Migrations](#apply-database-migrations)
5. [Configure Storage](#configure-storage)
6. [Environment Configuration](#environment-configuration)
7. [Testing & Verification](#testing--verification)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

Before starting, ensure you have:

- A Supabase account (https://app.supabase.com)
- Node.js 16+ installed locally
- Git installed
- Supabase CLI installed (`npm install -g supabase`)
- PostgreSQL client tools (optional but recommended)

## Create Supabase Project

### Step 1: Create New Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Select your organization
4. Fill in project details:
   - **Name**: `mess-management-system` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
   - **Pricing Plan**: Start with Free tier for development

5. Click "Create new project"
6. Wait for project to initialize (2-3 minutes)

### Step 2: Get Credentials

Once project is created:

1. Go to Settings → API
2. Note these credentials (you'll need them):
   - **Project URL**: `https://[PROJECT-ID].supabase.co`
   - **Public (anon) Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **Service Role Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (keep this secret!)
   - **Database Password**: The password you created

3. Go to Settings → Database
4. Note:
   - **Host**: `[PROJECT-ID].supabase.co`
   - **Database**: `postgres`
   - **Port**: `5432`
   - **Username**: `postgres`
   - **Password**: Your database password

## Configure Authentication

### Step 1: Enable Auth Providers

1. Go to Authentication → Providers
2. Ensure "Email" provider is enabled (default)
3. For production, enable additional providers:
   - Google OAuth
   - GitHub OAuth
   - Microsoft
   - Apple

### Step 2: Configure Email Settings

1. Go to Authentication → Email Templates
2. Customize templates for:
   - Confirm signup
   - Invite user
   - Magic link
   - Change email
   - Reset password

### Step 3: Create First User

1. Go to Authentication → Users
2. Click "Invite user"
3. Enter admin email address
4. Click "Send invite"
5. Check email for invite link
6. Set password

### Step 4: Create Service Account (for backend)

For the backend API to perform admin operations:

1. Go to Authentication → Users
2. Create a service account user with a strong password
3. Or use the service_role_key for admin operations

## Apply Database Migrations

### Method 1: Using Supabase CLI (Recommended)

```bash
# 1. Link to your Supabase project
supabase link --project-id YOUR_PROJECT_ID

# 2. Apply migrations
supabase migration up

# 3. Verify migrations
supabase migration list
```

### Method 2: Using SQL Editor

1. Go to SQL Editor in Supabase console
2. Create new query
3. Copy content from `migrations/001_create_schema.sql`
4. Execute query
5. Repeat for `002_enable_rls.sql` and `003_seed_data.sql`

### Method 3: Using Database Client

```bash
# Connect using psql
psql -h YOUR_HOST -U postgres -d postgres

# Then execute SQL files
\i migrations/001_create_schema.sql
\i migrations/002_enable_rls.sql
\i migrations/003_seed_data.sql
```

## Configure Storage

### Step 1: Create Storage Buckets

1. Go to Storage → Buckets
2. Create bucket "member-photos":
   - **Name**: `member-photos`
   - **Privacy**: Private
   - **Allowed MIME types**: `image/*`

3. Create bucket "receipts":
   - **Name**: `receipts`
   - **Privacy**: Private
   - **Allowed MIME types**: `application/pdf,image/*`

### Step 2: Configure Bucket Policies

For member-photos bucket:
```sql
-- Allow users to upload their own photos
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT WITH CHECK (
  auth.uid() = owner
);

-- Allow users to view all photos
CREATE POLICY "Users can view member photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE USING (
  auth.uid() = owner
);
```

For receipts bucket:
```sql
-- Allow users to upload receipts
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
);

-- Allow admin to view all receipts
CREATE POLICY "Admin can view all receipts"
ON storage.objects FOR SELECT
USING (
  (auth.jwt() ->> 'role' = 'admin')
);
```

## Environment Configuration

### Step 1: Create .env Files

Create `.env.local` in project root:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# For frontend (use anon key - less permissions)
REACT_APP_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# For backend (use service_role_key - full permissions)
SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_PASSWORD=your_database_password

# Backend Server
PORT=5000
NODE_ENV=development

# Email Service (for notifications)
EMAIL_SERVICE=supabase
EMAIL_FROM=noreply@messmanagement.com

# Admin Email
ADMIN_EMAIL=admin@messmanagement.com
```

### Step 2: Update Backend Configuration

Update `backend/src/config/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);

// For specific database queries
export const supabaseDb = {
  url: supabaseUrl,
  key: supabaseKey,
};
```

### Step 3: Update Frontend Configuration

Update `frontend/.env`:

```env
VITE_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:5000
```

## Testing & Verification

### Step 1: Verify Database Tables

```sql
-- Check all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected: 18 tables
-- users, members, meals, market, expenses, payments, 
-- monthly_bills, meal_rates, notices, notifications,
-- market_locks, password_reset_tokens, csrf_tokens,
-- activity_logs, backups, backup_logs, migration_logs
```

### Step 2: Verify RLS Policies

```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Should see 60+ policies
```

### Step 3: Test Authentication

```bash
# Test signup
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Test protected endpoint
curl -X GET http://localhost:5000/api/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 4: Verify RLS Enforcement

Test that RLS policies work correctly:

```typescript
// Test: User can only see their own data
const user1 = await supabase.auth.signUp({ 
  email: 'user1@example.com' 
});
const user2 = await supabase.auth.signUp({ 
  email: 'user2@example.com' 
});

// User1 should NOT see User2's data
const { data: user2Data, error } = await supabase
  .from('members')
  .select('*')
  .eq('user_id', user2.user.id);

// Should be empty or error
```

## Troubleshooting

### Issue: "Function does not exist" error

**Solution**: Make sure all migrations were applied in order:
1. `001_create_schema.sql` (creates functions)
2. `002_enable_rls.sql` (uses functions)
3. `003_seed_data.sql` (uses tables)

### Issue: "RLS policy prevents access" error

**Cause**: User doesn't have permission for the operation
**Solution**:
- Check user role (admin vs member)
- Verify JWT token is valid
- Check RLS policies in `002_enable_rls.sql`

```sql
-- Debug RLS issues
SET ROLE authenticated;
SELECT * FROM members; -- Should work if RLS set correctly

SET ROLE anon;
SELECT * FROM members; -- Should be empty if RLS correct
```

### Issue: "Authentication failed" error

**Solution**:
1. Check Supabase credentials in .env
2. Verify JWT token hasn't expired
3. Check if user exists and is confirmed

```bash
# Check user exists
curl -X GET https://YOUR_PROJECT.supabase.co/rest/v1/auth/users \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Issue: "Database connection timeout"

**Solution**:
1. Check internet connection
2. Verify Supabase project is running
3. Check if database password is correct
4. Verify firewall isn't blocking connection

### Issue: "Permission denied" error

**Solution**:
- Using anon key for admin operations? Use service_role_key instead
- Check bucket policies for storage operations
- Verify user role permissions

### Issue: Seed data not inserting

**Cause**: Foreign key dependencies or auth.users don't exist
**Solution**:
1. Create auth users first
2. Then run seed data migration
3. Check CASCADE constraints

## Backup & Recovery

### Enable Automated Backups

1. Go to Settings → Backups
2. Enable "Daily backups" (Pro tier feature)
3. Configure backup retention (minimum 7 days)

### Manual Backup

```bash
# Export database to file
pg_dump \
  postgresql://postgres:PASSWORD@PROJECT_ID.supabase.co:5432/postgres \
  > backup_$(date +%Y%m%d).sql
```

### Restore from Backup

```bash
# Restore database
psql \
  postgresql://postgres:PASSWORD@PROJECT_ID.supabase.co:5432/postgres \
  < backup_20240101.sql
```

## Production Checklist

- [ ] Use strong database password
- [ ] Keep Service Role key secret (never commit to git)
- [ ] Enable 2FA for Supabase account
- [ ] Set up automated backups
- [ ] Configure email settings for production
- [ ] Test all RLS policies with different user roles
- [ ] Enable SSL certificate verification
- [ ] Set up monitoring and alerts
- [ ] Document deployment procedures
- [ ] Create runbooks for common issues

## Next Steps

1. Complete this setup guide
2. Apply database migrations
3. Configure environment variables
4. Test authentication flow
5. Run application smoke tests
6. Deploy to production

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Project Repo**: [Your GitHub URL]
- **Issue Tracker**: [GitHub Issues URL]

For issues or questions, please refer to the troubleshooting section or check the project documentation.
