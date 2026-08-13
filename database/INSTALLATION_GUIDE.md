-- ============================================================================
-- DATABASE INSTALLATION & MIGRATION GUIDE
-- Mess Management System v1.1.0
-- ============================================================================

/*
IMPORTANT: This guide explains how to apply migrations to your Supabase database.

There are 3 main ways to apply migrations:

1. SUPABASE CLI (Recommended for development)
2. SUPABASE WEB CONSOLE (For quick testing)
3. DIRECT SQL EXECUTION (For migration files)

Follow the steps below based on your preferred method.
*/

-- ============================================================================
-- METHOD 1: USING SUPABASE CLI (Recommended)
-- ============================================================================

/*
Step 1: Install Supabase CLI
   npm install -g supabase

Step 2: Initialize Supabase project
   supabase init

Step 3: Link to your Supabase project
   supabase link --project-id YOUR_PROJECT_ID

Step 4: Create migration files
   supabase migration new create_schema
   supabase migration new enable_rls
   supabase migration new seed_data

Step 5: Copy migration content to newly created files
   - Copy 001_create_schema.sql content
   - Copy 002_enable_rls.sql content
   - Copy 003_seed_data.sql content

Step 6: Apply migrations locally
   supabase migration up

Step 7: Push migrations to production
   supabase db push

Step 8: Verify migrations
   supabase migration list
*/

-- ============================================================================
-- METHOD 2: USING SUPABASE WEB CONSOLE
-- ============================================================================

/*
Step 1: Go to https://app.supabase.com
Step 2: Select your project
Step 3: Navigate to SQL Editor
Step 4: Create new query
Step 5: Copy and paste each migration file content
Step 6: Execute each migration in order:
   1. 001_create_schema.sql
   2. 002_enable_rls.sql
   3. 003_seed_data.sql

NOTE: Execute migrations in sequence, waiting for each to complete.
*/

-- ============================================================================
-- STEP 1: CREATE SCHEMA
-- ============================================================================

/*
Copy the entire content of 001_create_schema.sql file and execute in SQL editor.

This migration:
- Creates 18 tables
- Adds all columns and constraints
- Creates 60+ indexes
- Creates 11 triggers
- Creates 4 functions
- Defines 6 enum types

Expected result: All tables created successfully
*/

-- ============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

/*
Copy the entire content of 002_enable_rls.sql file and execute in SQL editor.

This migration:
- Enables RLS on all 18 tables
- Creates 60+ RLS policies
- Creates helper functions (is_admin, auth_user_id)
- Implements role-based access control

Expected result: RLS policies applied to all tables
*/

-- ============================================================================
-- STEP 3: SEED TEST DATA
-- ============================================================================

/*
Copy the entire content of 003_seed_data.sql file and execute in SQL editor.

This migration:
- Creates test users
- Adds 8 sample members
- Creates sample meals
- Creates sample market entries
- Adds sample expenses
- Records sample payments
- Creates sample notices
- Calculates meal rates
- Generates sample bills

Expected result: Sample data inserted successfully
*/

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

/*
After applying all migrations, verify installation with these queries:
*/

-- 1. Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check enum types
SELECT typname 
FROM pg_type 
WHERE typtype = 'e'
ORDER BY typname;

-- 3. Check indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY indexname;

-- 4. Check triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- 5. Check RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 6. Count test data
SELECT 
  'Users' as entity, COUNT(*) as count FROM public.users
UNION ALL
SELECT 'Members', COUNT(*) FROM public.members
UNION ALL
SELECT 'Meals', COUNT(*) FROM public.meals
UNION ALL
SELECT 'Market', COUNT(*) FROM public.market
UNION ALL
SELECT 'Expenses', COUNT(*) FROM public.expenses
UNION ALL
SELECT 'Payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'Notices', COUNT(*) FROM public.notices;

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

/*
Issue: "Function not found" error
Solution: Make sure 001_create_schema.sql was executed before 002_enable_rls.sql

Issue: "Table does not exist" error
Solution: Check if previous migrations completed successfully

Issue: "RLS policy prevents access" error
Solution: 
- Check if user is authenticated
- Verify user role (admin vs member)
- Check RLS policies are correct

Issue: "Permission denied" error
Solution:
- Ensure you have sufficient permissions
- Use service_role key for admin operations
- Check Supabase project settings

Issue: Seed data not inserting
Solution:
- Delete existing data first (if needed)
- Ensure timestamps are valid
- Check foreign key references exist
*/

-- ============================================================================
-- ROLLBACK PROCEDURES
-- ============================================================================

/*
If you need to rollback migrations:

Option 1: Drop all tables and start over
   DROP TABLE IF EXISTS public.monthly_bills CASCADE;
   DROP TABLE IF EXISTS public.meal_rates CASCADE;
   DROP TABLE IF EXISTS public.backup_logs CASCADE;
   DROP TABLE IF EXISTS public.backups CASCADE;
   ... (repeat for all tables)

Option 2: Reset entire database
   supabase db reset

Option 3: Delete specific table
   DROP TABLE IF EXISTS public.table_name CASCADE;

WARNING: These operations are destructive and cannot be undone!
*/

-- ============================================================================
-- MAINTENANCE SCRIPTS
-- ============================================================================

/*
Run these periodically to maintain database health:
*/

-- Clean up expired tokens (monthly)
DELETE FROM public.password_reset_tokens
WHERE expires_at < NOW() - INTERVAL '24 hours';

DELETE FROM public.csrf_tokens
WHERE expires_at < NOW();

-- Archive old activity logs (quarterly)
UPDATE public.activity_logs
SET is_archived = TRUE
WHERE created_at < NOW() - INTERVAL '90 days'
  AND is_archived = FALSE;

-- Analyze for performance (monthly)
ANALYZE public.meals;
ANALYZE public.payments;
ANALYZE public.market;
ANALYZE public.monthly_bills;

-- Vacuum for cleanup (monthly)
VACUUM ANALYZE public.meals;
VACUUM ANALYZE public.payments;
VACUUM ANALYZE public.market;

-- ============================================================================
-- POST-INSTALLATION CHECKLIST
-- ============================================================================

/*
✓ All migrations applied successfully
✓ All tables created (18 total)
✓ All indexes created (60+)
✓ All triggers active (11)
✓ All functions defined (4+)
✓ RLS policies enabled (60+)
✓ Test data seeded
✓ Verification queries passed
✓ User authentication configured
✓ Environment variables set (.env)
✓ Backend API configured
✓ Frontend environment set

Next steps:
1. Update .env with Supabase credentials
2. Test API endpoints with test data
3. Verify RLS policies work correctly
4. Run application smoke tests
5. Monitor database performance
6. Schedule backup automation
7. Setup monitoring alerts
*/

-- ============================================================================
-- ADMINISTRATION QUERIES
-- ============================================================================

/*
Useful queries for database administration:
*/

-- Get database size
SELECT 
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'postgres';

-- Get table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Get slow queries
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Monitor active connections
SELECT 
  count(*) as active_connections,
  max(query_start) as oldest_query
FROM pg_stat_activity
WHERE state = 'active';

-- Check table bloat
SELECT 
  schemaname,
  tablename,
  round(100 * (pg_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename, 'main')) / pg_relation_size(schemaname||'.'||tablename)) as bloat_percent
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bloat_percent DESC;

-- ============================================================================
-- BACKUP & RECOVERY
-- ============================================================================

/*
Backup procedures:

1. Create automated daily backup:
   INSERT INTO public.backups (backup_data, created_by, status)
   SELECT row_to_json(t) as backup_data, auth.uid(), 'completed'
   FROM (SELECT * FROM all_tables) t;

2. Create point-in-time backup:
   Use Supabase automated backups (available in pro tier)

3. Export data to CSV:
   \COPY public.members TO 'members_backup.csv' WITH CSV HEADER;

4. Restore from backup:
   SELECT public.restore_backup(backup_id);
*/

-- ============================================================================
-- END OF INSTALLATION GUIDE
-- ============================================================================

/*
For more information:
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Project Documentation: See DATABASE_SCHEMA.md

Support:
- GitHub Issues: Check project repository
- Supabase Support: https://app.supabase.com/support
*/
