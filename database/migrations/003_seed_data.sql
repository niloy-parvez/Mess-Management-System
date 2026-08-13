-- ============================================================================
-- SEED DATA FOR MESS MANAGEMENT SYSTEM
-- Version: 1.1.0
-- Purpose: Initial test data for development and demo
-- NOTE: In production, seed data should be added via admin UI
-- ============================================================================

-- ============================================================================
-- CLEAR EXISTING DATA (Optional - use with caution)
-- ============================================================================

-- Comment these out if you want to preserve existing data
-- DELETE FROM public.monthly_bills;
-- DELETE FROM public.meal_rates;
-- DELETE FROM public.csrf_tokens;
-- DELETE FROM public.password_reset_tokens;
-- DELETE FROM public.backup_logs;
-- DELETE FROM public.backups;
-- DELETE FROM public.market_locks;
-- DELETE FROM public.activity_logs;
-- DELETE FROM public.notifications;
-- DELETE FROM public.notices;
-- DELETE FROM public.payments;
-- DELETE FROM public.expenses;
-- DELETE FROM public.market;
-- DELETE FROM public.meals;
-- DELETE FROM public.members;
-- DELETE FROM public.users;

-- ============================================================================
-- SEED DATA: USERS (test accounts)
-- ============================================================================

-- NOTE: These users need to be created in Supabase Auth first
-- For testing purposes, you'll need to:
-- 1. Create auth accounts in Supabase Auth
-- 2. Get their UUIDs
-- 3. Update these queries with the correct UUIDs

-- Example admin user (replace with actual auth UID)
-- INSERT INTO public.users (auth_id, email, name, phone, role, is_active)
-- VALUES (
--   '11111111-1111-1111-1111-111111111111'::UUID,
--   'admin@mess.local',
--   'Admin User',
--   '01712345678',
--   'admin',
--   TRUE
-- );

-- ============================================================================
-- SEED DATA: MEMBERS
-- ============================================================================

-- Sample members for testing
INSERT INTO public.members (name, email, phone, room_number, join_date, is_active)
VALUES
  ('Md. Karim Ahmed', 'karim.ahmed@student.local', '01712345678', '101', CURRENT_DATE, TRUE),
  ('Fatima Khan', 'fatima.khan@student.local', '01798765432', '102', CURRENT_DATE, TRUE),
  ('Rahman Hassan', 'rahman.hassan@student.local', '01712121212', '103', CURRENT_DATE, TRUE),
  ('Jahan Ahmed', 'jahan.ahmed@student.local', '01734343434', '104', CURRENT_DATE, TRUE),
  ('Sadia Islam', 'sadia.islam@student.local', '01755555555', '105', CURRENT_DATE, TRUE),
  ('Ali Hassan', 'ali.hassan@student.local', '01766666666', '106', CURRENT_DATE, TRUE),
  ('Nayeema Aktar', 'nayeema.aktar@student.local', '01777777777', '107', CURRENT_DATE, TRUE),
  ('Bilal Khan', 'bilal.khan@student.local', '01788888888', '108', CURRENT_DATE, TRUE),
  ('Huma Begum', 'huma.begum@student.local', '01799999999', '109', CURRENT_DATE - INTERVAL '90 days', FALSE),
  ('Rashed Ali', 'rashed.ali@student.local', '01700000000', '110', CURRENT_DATE - INTERVAL '180 days', FALSE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SEED DATA: MEALS
-- ============================================================================

-- Sample meal records for current month
-- Create meals for the first 10 days of current month

INSERT INTO public.meals (member_id, meal_type, meal_date)
SELECT 
  m.id,
  meal_type,
  CURRENT_DATE - (row_number() OVER (ORDER BY m.id) - 1)::INTEGER
FROM (
  SELECT id FROM public.members WHERE is_active = TRUE LIMIT 5
) m
CROSS JOIN (SELECT UNNEST(ARRAY['breakfast', 'lunch', 'dinner']::meal_type[]) as meal_type) mt
WHERE CURRENT_DATE - (row_number() OVER (ORDER BY m.id) - 1)::INTEGER >= DATE_TRUNC('month', CURRENT_DATE)::DATE
ON CONFLICT (member_id, meal_type, meal_date) DO NOTHING;

-- ============================================================================
-- SEED DATA: MARKET ENTRIES
-- ============================================================================

-- Sample market entries with approved items
INSERT INTO public.market (market_date, items, total_cost, approved_by, approved_at, is_approved, created_by)
SELECT 
  CURRENT_DATE - 5,
  '[
    {"name": "Rice", "quantity": 10, "unit": "kg", "price": 4500},
    {"name": "Lentil", "quantity": 5, "unit": "kg", "price": 1500},
    {"name": "Oil", "quantity": 3, "unit": "liter", "price": 900},
    {"name": "Spices", "quantity": 1, "unit": "set", "price": 300}
  ]'::JSONB,
  7200.00,
  u.id,
  CURRENT_DATE - 5,
  TRUE,
  u.id
FROM auth.users u
WHERE (u.user_metadata->>'role') = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Another market entry
INSERT INTO public.market (market_date, items, total_cost, approved_by, approved_at, is_approved, created_by)
SELECT 
  CURRENT_DATE - 2,
  '[
    {"name": "Vegetables", "quantity": 8, "unit": "kg", "price": 2400},
    {"name": "Fish", "quantity": 4, "unit": "kg", "price": 3200},
    {"name": "Salt", "quantity": 1, "unit": "kg", "price": 50}
  ]'::JSONB,
  5650.00,
  u.id,
  CURRENT_DATE - 2,
  TRUE,
  u.id
FROM auth.users u
WHERE (u.user_metadata->>'role') = 'admin'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: EXPENSES
-- ============================================================================

-- Sample expenses for current month
INSERT INTO public.expenses (category, amount, expense_date, description, created_by)
SELECT 
  expense_cat,
  amount,
  CURRENT_DATE - 3,
  description,
  u.id
FROM (VALUES
  ('gas'::expense_category, 800.00, 'Gas for cooking'),
  ('electricity'::expense_category, 3500.00, 'Electricity bill'),
  ('internet'::expense_category, 1500.00, 'Internet bill'),
  ('water'::expense_category, 500.00, 'Water bill'),
  ('maintenance'::expense_category, 1000.00, 'Repair and maintenance')
) AS exp(expense_cat, amount, description)
CROSS JOIN (
  SELECT id FROM auth.users WHERE (user_metadata->>'role') = 'admin' LIMIT 1
) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: PAYMENTS
-- ============================================================================

-- Sample payments from members
INSERT INTO public.payments (member_id, amount, payment_method, payment_date, reference, verified, verified_by, verified_at, created_by)
SELECT 
  m.id,
  5000.00,
  'cash'::payment_method,
  CURRENT_DATE - 1,
  'Reference-' || ROW_NUMBER() OVER (ORDER BY m.id),
  TRUE,
  u.id,
  CURRENT_TIMESTAMP,
  u.id
FROM public.members m
CROSS JOIN (SELECT id FROM auth.users WHERE (user_metadata->>'role') = 'admin' LIMIT 1) u
WHERE m.is_active = TRUE
LIMIT 5
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: NOTICES
-- ============================================================================

-- Sample notices
INSERT INTO public.notices (title, content, priority, created_by)
SELECT 
  title,
  content,
  'high'::VARCHAR,
  u.id
FROM (VALUES
  ('Market Day', 'Market shopping will be done on Sunday at 9 AM. Please ensure your meals are up to date.'),
  ('Maintenance Notice', 'Water tank cleaning will be done on Saturday. No water supply from 10 AM to 2 PM.'),
  ('Monthly Meeting', 'Monthly meeting scheduled for Friday at 7 PM. All members are requested to attend.')
) AS notices(title, content)
CROSS JOIN (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) u
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: MEAL RATES (Sample calculation)
-- ============================================================================

-- Sample meal rate for current month
INSERT INTO public.meal_rates (month, year, rate_per_meal, total_meals, total_expenses, market_cost)
VALUES (
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  650.00,
  120,
  7800.00,
  7850.00
)
ON CONFLICT (month, year) DO UPDATE SET
  rate_per_meal = 650.00,
  total_meals = 120,
  total_expenses = 7800.00,
  market_cost = 7850.00;

-- Sample meal rate for previous month
INSERT INTO public.meal_rates (month, year, rate_per_meal, total_meals, total_expenses, market_cost)
VALUES (
  CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 1 THEN 12
    ELSE EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER - 1
  END,
  CASE 
    WHEN EXTRACT(MONTH FROM CURRENT_DATE) = 1 THEN EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - 1
    ELSE EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
  END,
  620.00,
  115,
  7500.00,
  7650.00
)
ON CONFLICT (month, year) DO UPDATE SET
  rate_per_meal = 620.00,
  total_meals = 115,
  total_expenses = 7500.00,
  market_cost = 7650.00;

-- ============================================================================
-- SEED DATA: MONTHLY BILLS
-- ============================================================================

-- Generate monthly bills for current month
INSERT INTO public.monthly_bills (member_id, month, year, total_meals, meal_rate, total_cost, paid_amount, status, due_date)
SELECT 
  m.id,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  28,
  650.00,
  18200.00,
  5000.00,
  'partial',
  CURRENT_DATE + INTERVAL '5 days'
FROM public.members m
WHERE m.is_active = TRUE
ON CONFLICT (member_id, month, year) DO UPDATE SET
  total_meals = 28,
  meal_rate = 650.00,
  total_cost = 18200.00,
  paid_amount = 5000.00,
  status = 'partial';

-- ============================================================================
-- SEED DATA: MARKET LOCKS
-- ============================================================================

-- Lock current month (optional - uncomment to lock current month)
-- INSERT INTO public.market_locks (month, year, locked_at, created_by)
-- SELECT 
--   EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
--   EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
--   CURRENT_TIMESTAMP,
--   u.id
-- FROM public.users u
-- WHERE u.role = 'admin'
-- LIMIT 1
-- ON CONFLICT (month, year) DO NOTHING;

-- ============================================================================
-- SEED DATA: SETTINGS
-- ============================================================================

INSERT INTO public.settings (key, value, description)
VALUES
  ('mess_name', '{"value": "Green Field Mess"}'::JSONB, 'Default mess name for the dashboard and reports'),
  ('default_currency', '{"value": "BDT"}'::JSONB, 'Default currency symbol for display'),
  ('meal_rate_buffer', '{"value": 0.05}'::JSONB, 'Default buffer percentage for meal rate calculations')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- VERIFY SEED DATA
-- ============================================================================

-- Show summary of seeded data
SELECT 'Auth Users' as entity, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Users (profiles)', COUNT(*) FROM public.users
UNION ALL
SELECT 'Members', COUNT(*) FROM public.members
UNION ALL
SELECT 'Meals', COUNT(*) FROM public.meals
UNION ALL
SELECT 'Market Entries', COUNT(*) FROM public.market
UNION ALL
SELECT 'Expenses', COUNT(*) FROM public.expenses
UNION ALL
SELECT 'Payments', COUNT(*) FROM public.payments
UNION ALL
SELECT 'Notices', COUNT(*) FROM public.notices
UNION ALL
SELECT 'Meal Rates', COUNT(*) FROM public.meal_rates
UNION ALL
SELECT 'Monthly Bills', COUNT(*) FROM public.monthly_bills;

-- ============================================================================
-- END OF SEED DATA
-- ============================================================================
