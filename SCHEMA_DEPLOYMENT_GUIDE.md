# Schema Deployment Guide

This guide explains how to apply the Supabase PostgreSQL schema to your Mess Management System project.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Automatic Migration (Recommended)](#automatic-migration-recommended)
3. [Manual Migration via Supabase SQL Editor](#manual-migration-via-supabase-sql-editor)
4. [Verification](#verification)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Access to your Supabase project dashboard
- Environment variables configured in `backend/.env`:
  - `SUPABASE_URL`: Your Supabase project URL
  - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
  - `JWT_SECRET`: A secure JWT secret for token generation
  - (Optional) `DATABASE_URL`: PostgreSQL connection string for direct database access

---

## Automatic Migration (Recommended)

### Option A: Using PostgreSQL Direct Connection

If you have a direct PostgreSQL connection string to your Supabase database:

1. **Set DATABASE_URL in backend/.env:**
   ```
   DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres
   ```

2. **Run the migration script:**
   ```bash
   cd database
   node db-migrate.js up
   ```

   This will:
   - Execute `001_create_schema.sql` to create all tables, indexes, and functions
   - Execute `002_enable_rls.sql` to enable Row Level Security and create RLS policies
   - Execute `003_seed_data.sql` to populate test data for development
   - Log all migrations to the `public.migration_logs` table

3. **Verify the migration:**
   ```bash
   node db-migrate.js status
   ```

### Option B: Using Supabase Service Role (Requires Supabase CLI)

If you have the Supabase CLI installed:

1. **Install Supabase CLI (if not already installed):**
   ```bash
   npm install -g supabase
   ```

2. **Link your project:**
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. **Push the schema:**
   ```bash
   supabase db push
   ```

---

## Manual Migration via Supabase SQL Editor

If automatic migration doesn't work, use the Supabase dashboard:

### Step 1: Create the Schema

1. Go to your Supabase project: https://app.supabase.com
2. Navigate to **SQL Editor** → **New Query**
3. Open `database/migrations/001_create_schema.sql`
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run**
6. Wait for success (should complete in 10-30 seconds)

### Step 2: Enable RLS and Create Policies

1. In SQL Editor, create a new query
2. Open `database/migrations/002_enable_rls.sql`
3. Copy and paste into the SQL Editor
4. Click **Run**
5. Wait for success

### Step 3: Seed Development Data

1. In SQL Editor, create a new query
2. Open `database/migrations/003_seed_data.sql`
3. Copy and paste into the SQL Editor
4. Click **Run**
5. Wait for success

---

## Verification

After applying migrations, verify the schema is correctly created:

### Using Supabase Dashboard

1. Go to **Table Editor** in Supabase dashboard
2. You should see these tables in the `public` schema:
   - `users`
   - `members`
   - `meals`
   - `market`
   - `expenses`
   - `payments`
   - `notices`
   - `notifications`
   - `settings`
   - `activity_logs`
   - `market_locks`
   - `backups`
   - `backup_logs`
   - `meal_rates`
   - `monthly_bills`
   - `password_reset_tokens`
   - `csrf_tokens`
   - `migration_logs`

### Using Backend API

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Test a protected endpoint:
   ```bash
   # Register a test user
   curl -X POST http://localhost:5000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPass123!",
       "full_name": "Test User",
       "phone": "01700000000"
     }'

   # Login
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "TestPass123!"
     }'

   # Get dashboard stats (use token from login)
   curl -X GET http://localhost:5000/api/dashboard/stats \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

3. If dashboard stats return data (even zeros), the schema is successfully deployed.

---

## Troubleshooting

### Issue: "Could not find the table 'public.TABLENAME' in the schema cache"

**Cause:** Schema migration has not been applied.

**Solution:** Follow the "Schema Deployment" section above to apply migrations.

### Issue: "Migration failed: PGRST205"

**Cause:** Supabase REST API is returning an error (usually because a table or function doesn't exist).

**Solution:** 
- Ensure all three migration files (`001_create_schema.sql`, `002_enable_rls.sql`, `003_seed_data.sql`) have been applied in order
- Check Supabase SQL Editor for any errors during manual migration

### Issue: "Error: Could not find the function public.exec_sql(sql) in the schema cache"

**Cause:** Using Supabase API (`rpc` method) without the `exec_sql` function being defined.

**Solution:**
- Use the `DATABASE_URL` direct connection method instead, or
- Manually apply the SQL migrations using Supabase SQL Editor

### Issue: RLS Policies are blocking queries

**Cause:** RLS policies require proper authentication context.

**Solution:**
- Ensure the JWT token is correctly set in the Authorization header
- Verify the user exists in the `public.users` table
- Check the RLS policy for the specific table being queried

### Issue: "Error: Code 22023. Hint: The type of one of the function parameters is not supposed to be used as a default value."

**Cause:** PostgreSQL version incompatibility with some function definitions.

**Solution:**
- Contact Supabase support or manually fix the affected function in SQL Editor
- The core tables should still work even if one function has issues

---

## Schema Overview

### Authentication
- **users**: Maps Supabase Auth users to profile data
- **migration_logs**: Tracks schema migration history

### Core Data
- **members**: Mess members with contact info and photos
- **meals**: Daily meal tracking (breakfast, lunch, dinner)
- **market**: Shopping entries with items and approval status
- **expenses**: Monthly expenses by category
- **payments**: Payment tracking with verification

### Reporting & Billing
- **meal_rates**: Monthly calculated meal costs
- **monthly_bills**: Monthly per-member billing
- **market_locks**: Prevent editing after period close

### Admin Features
- **notices**: Admin announcements
- **notifications**: User-specific notifications
- **settings**: System configuration (stored as JSONB)
- **activity_logs**: Audit trail
- **backups**: Database backup records
- **backup_logs**: Backup action history

### Security
- **password_reset_tokens**: Secure password reset
- **csrf_tokens**: CSRF attack protection

---

## Performance Indexes

All tables have performance-optimized indexes on:
- Foreign keys
- Frequently filtered columns (date ranges, status, archived)
- User ID for RLS filtering
- Composite indexes for common query patterns

---

## Next Steps

After schema deployment:

1. **Test all APIs:**
   - Registration and login
   - CRUD operations for members, meals, market
   - Dashboard statistics
   - Report generation

2. **Configure RBAC:**
   - Create admin user accounts as needed
   - Test admin-only endpoints with member accounts (should fail)
   - Test member endpoints with admin accounts (should succeed)

3. **Populate Test Data:**
   - Run the seed data migration (`003_seed_data.sql`)
   - Or manually add members, meals, and expenses via the frontend

4. **Deploy Frontend:**
   - Build and deploy frontend to Vercel
   - Configure `VITE_API_BASE_URL` to point to backend

5. **Deploy Backend:**
   - Deploy backend to Render or Railway
   - Configure all environment variables
   - Test all APIs against production

---

## Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review error messages in backend logs (located in `backend/logs/`)
3. Check Supabase dashboard for RLS policy warnings
4. Verify environment variables are correctly set
5. Ensure Supabase project is not on Free tier with database scaling limits

For additional help, see:
- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- Project README.md
