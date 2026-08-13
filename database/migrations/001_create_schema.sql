-- ============================================================================
-- MESS MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- Version: 1.1.0
-- Created: January 2024
-- Purpose: Complete PostgreSQL schema for Mess Management System
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- 2. ENUM TYPES
-- ============================================================================

-- User role enum
CREATE TYPE user_role AS ENUM ('admin', 'member');

-- Meal type enum
CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner');

-- Payment method enum
CREATE TYPE payment_method AS ENUM ('cash', 'bkash', 'nagad', 'bank_transfer');

-- Expense category enum
CREATE TYPE expense_category AS ENUM (
  'gas',
  'electricity',
  'internet',
  'water',
  'maid_salary',
  'maintenance',
  'others'
);

-- Notification type enum
CREATE TYPE notification_type AS ENUM (
  'payment',
  'market',
  'notice',
  'backup',
  'member',
  'due_update',
  'payment_update',
  'monthly_lock'
);

-- Activity type enum
CREATE TYPE activity_type AS ENUM (
  'member_added',
  'member_removed',
  'member_updated',
  'meal_added',
  'market_entry',
  'payment_recorded',
  'expense_added',
  'notice_posted',
  'backup_created'
);

-- ============================================================================
-- 3. USERS TABLE (Auth table - links to Supabase Auth)
-- ============================================================================

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role user_role DEFAULT 'member',
  is_active BOOLEAN DEFAULT TRUE,
  avatar_url TEXT,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- Create index on auth_id for faster lookups
CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_role ON public.users(role);
CREATE INDEX idx_users_is_active ON public.users(is_active);

-- ============================================================================
-- 4. MEMBERS TABLE
-- ============================================================================

CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  room_number VARCHAR(50) UNIQUE NOT NULL,
  join_date DATE NOT NULL DEFAULT CURRENT_DATE,
  leave_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT email_lowercase CHECK (email = LOWER(email)),
  CONSTRAINT valid_leave_date CHECK (leave_date IS NULL OR leave_date >= join_date)
);

-- Create indexes for better query performance
CREATE INDEX idx_members_is_active ON public.members(is_active);
CREATE INDEX idx_members_room_number ON public.members(room_number);
CREATE INDEX idx_members_email ON public.members(email);
CREATE INDEX idx_members_user_id ON public.members(user_id);
CREATE INDEX idx_members_created_at ON public.members(created_at DESC);

-- ============================================================================
-- 5. MEALS TABLE
-- ============================================================================

CREATE TABLE public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  meal_type meal_type NOT NULL,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_meal_per_day UNIQUE (member_id, meal_type, meal_date)
);

-- Create indexes for performance
CREATE INDEX idx_meals_member_id ON public.meals(member_id);
CREATE INDEX idx_meals_meal_date ON public.meals(meal_date);
CREATE INDEX idx_meals_meal_type ON public.meals(meal_type);
CREATE INDEX idx_meals_composite ON public.meals(meal_date, member_id);

-- ============================================================================
-- 6. MARKET TABLE
-- ============================================================================

CREATE TABLE public.market (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_date DATE NOT NULL DEFAULT CURRENT_DATE,
  items JSONB NOT NULL DEFAULT '[]',
  total_cost DECIMAL(10, 2) NOT NULL CHECK (total_cost >= 0),
  description TEXT,
  receipt_url TEXT,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  is_approved BOOLEAN DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Sample JSONB structure for items:
  -- [{"name": "Rice", "quantity": 5, "unit": "kg", "price": 500}]
  CONSTRAINT valid_approval CHECK (
    (is_approved AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    NOT is_approved
  )
);

-- Create indexes
CREATE INDEX idx_market_market_date ON public.market(market_date DESC);
CREATE INDEX idx_market_is_approved ON public.market(is_approved);
CREATE INDEX idx_market_created_by ON public.market(created_by);
CREATE INDEX idx_market_created_at ON public.market(created_at DESC);

-- ============================================================================
-- 7. EXPENSES TABLE
-- ============================================================================

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category expense_category NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_expenses_category ON public.expenses(category);
CREATE INDEX idx_expenses_expense_date ON public.expenses(expense_date);
CREATE INDEX idx_expenses_created_by ON public.expenses(created_by);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);
CREATE INDEX idx_expenses_composite ON public.expenses(expense_date, category);

-- ============================================================================
-- 8. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  payment_method payment_method NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference VARCHAR(255),
  notes TEXT,
  receipt_url TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_payments_member_id ON public.payments(member_id);
CREATE INDEX idx_payments_payment_date ON public.payments(payment_date);
CREATE INDEX idx_payments_payment_method ON public.payments(payment_method);
CREATE INDEX idx_payments_verified ON public.payments(verified);
CREATE INDEX idx_payments_verified_by ON public.payments(verified_by);
CREATE INDEX idx_payments_created_by ON public.payments(created_by);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_payments_composite ON public.payments(member_id, payment_date DESC);

-- ============================================================================
-- 9. NOTICES TABLE
-- ============================================================================

CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  is_archived BOOLEAN DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_notices_is_archived ON public.notices(is_archived);
CREATE INDEX idx_notices_created_by ON public.notices(created_by);
CREATE INDEX idx_notices_created_at ON public.notices(created_at DESC);
CREATE INDEX idx_notices_priority ON public.notices(priority);

-- ============================================================================
-- 10. NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type notification_type,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  related_id UUID,
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Sample data structure:
  -- {"payment_id": "uuid", "amount": 5000}
  CONSTRAINT valid_read_timestamp CHECK (
    (is_read AND read_at IS NOT NULL) OR
    NOT is_read
  )
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_composite ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- 11. SETTINGS TABLE
-- ============================================================================

CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::JSONB,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON public.settings(key);

-- ============================================================================
-- 12. ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type activity_type NOT NULL,
  description TEXT,
  related_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_related_id ON public.activity_logs(related_id);

-- ============================================================================
-- 12. MARKET LOCKS TABLE
-- ============================================================================

CREATE TABLE public.market_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_lock UNIQUE (month, year),
  CONSTRAINT valid_unlock CHECK (
    (unlocked_at IS NULL) OR
    (unlocked_at IS NOT NULL AND unlocked_at >= locked_at)
  )
);

-- Create indexes
CREATE INDEX idx_market_locks_month_year ON public.market_locks(year, month DESC);
CREATE INDEX idx_market_locks_created_by ON public.market_locks(created_by);

-- ============================================================================
-- 13. BACKUPS TABLE
-- ============================================================================

CREATE TABLE public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_data JSONB NOT NULL,
  backup_size_bytes BIGINT,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_backups_created_by ON public.backups(created_by);
CREATE INDEX idx_backups_created_at ON public.backups(created_at DESC);
CREATE INDEX idx_backups_status ON public.backups(status);

-- ============================================================================
-- 14. BACKUP LOGS TABLE
-- ============================================================================

CREATE TABLE public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES public.backups(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'restore', 'download')),
  record_count INTEGER,
  restored_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_backup_logs_backup_id ON public.backup_logs(backup_id);
CREATE INDEX idx_backup_logs_action ON public.backup_logs(action);
CREATE INDEX idx_backup_logs_created_at ON public.backup_logs(created_at DESC);

-- ============================================================================
-- 15. MIGRATION LOGS TABLE
-- ============================================================================

CREATE TABLE public.migration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('up', 'down')),
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_migration_logs_name ON public.migration_logs(name);
CREATE INDEX idx_migration_logs_executed_at ON public.migration_logs(executed_at DESC);

-- ============================================================================
-- 16. MEAL RATES TABLE (Monthly calculation)
-- ============================================================================

CREATE TABLE public.meal_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  rate_per_meal DECIMAL(10, 2) NOT NULL CHECK (rate_per_meal >= 0),
  total_meals INTEGER NOT NULL CHECK (total_meals >= 0),
  total_expenses DECIMAL(10, 2) NOT NULL CHECK (total_expenses >= 0),
  market_cost DECIMAL(10, 2) NOT NULL CHECK (market_cost >= 0),
  calculated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_meal_rate UNIQUE (month, year)
);

-- Create indexes
CREATE INDEX idx_meal_rates_month_year ON public.meal_rates(year DESC, month DESC);
CREATE INDEX idx_meal_rates_calculated_by ON public.meal_rates(calculated_by);

-- ============================================================================
-- 16. MONTHLY BILLS TABLE
-- ============================================================================

CREATE TABLE public.monthly_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  total_meals INTEGER NOT NULL CHECK (total_meals >= 0),
  meal_rate DECIMAL(10, 2) NOT NULL CHECK (meal_rate >= 0),
  total_cost DECIMAL(10, 2) NOT NULL CHECK (total_cost >= 0),
  paid_amount DECIMAL(10, 2) DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount DECIMAL(10, 2) GENERATED ALWAYS AS (total_cost - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid')),
  due_date DATE,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_bill UNIQUE (member_id, month, year),
  CONSTRAINT valid_paid_amount CHECK (paid_amount <= total_cost)
);

-- Create indexes
CREATE INDEX idx_monthly_bills_member_id ON public.monthly_bills(member_id);
CREATE INDEX idx_monthly_bills_month_year ON public.monthly_bills(year DESC, month DESC);
CREATE INDEX idx_monthly_bills_status ON public.monthly_bills(status);
CREATE INDEX idx_monthly_bills_due_date ON public.monthly_bills(due_date);
CREATE INDEX idx_monthly_bills_composite ON public.monthly_bills(member_id, year DESC, month DESC);

-- ============================================================================
-- 17. PASSWORD RESET TOKENS TABLE
-- ============================================================================

CREATE TABLE public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens(expires_at);

-- ============================================================================
-- 18. CSRF TOKENS TABLE
-- ============================================================================

CREATE TABLE public.csrf_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_csrf_tokens_session_id ON public.csrf_tokens(session_id);
CREATE INDEX idx_csrf_tokens_expires_at ON public.csrf_tokens(expires_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp for users
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to members table
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to meals table
CREATE TRIGGER update_meals_updated_at
BEFORE UPDATE ON public.meals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to market table
CREATE TRIGGER update_market_updated_at
BEFORE UPDATE ON public.market
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to expenses table
CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to payments table
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to notices table
CREATE TRIGGER update_notices_updated_at
BEFORE UPDATE ON public.notices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to notifications table
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to market_locks table
CREATE TRIGGER update_market_locks_updated_at
BEFORE UPDATE ON public.market_locks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to settings table
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to meal_rates table
CREATE TRIGGER update_meal_rates_updated_at
BEFORE UPDATE ON public.meal_rates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Apply trigger to monthly_bills table
CREATE TRIGGER update_monthly_bills_updated_at
BEFORE UPDATE ON public.monthly_bills
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- STORED PROCEDURES & FUNCTIONS
-- ============================================================================

-- Function to calculate meal rate for a month
CREATE OR REPLACE FUNCTION public.calculate_meal_rate(
  p_month INTEGER,
  p_year INTEGER
)
RETURNS TABLE (
  rate_per_meal DECIMAL,
  total_meals BIGINT,
  total_expenses DECIMAL,
  market_cost DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH month_meals AS (
    SELECT COUNT(*) as total_meals
    FROM public.meals
    WHERE EXTRACT(MONTH FROM meal_date) = p_month
      AND EXTRACT(YEAR FROM meal_date) = p_year
  ),
  month_expenses AS (
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM public.expenses
    WHERE EXTRACT(MONTH FROM expense_date) = p_month
      AND EXTRACT(YEAR FROM expense_date) = p_year
  ),
  month_market AS (
    SELECT COALESCE(SUM(total_cost), 0) as market_cost
    FROM public.market
    WHERE EXTRACT(MONTH FROM market_date) = p_month
      AND EXTRACT(YEAR FROM market_date) = p_year
      AND is_approved = TRUE
  )
  SELECT 
    CASE 
      WHEN mm.total_meals > 0 
      THEN ((me.total_expenses + mmar.market_cost) / mm.total_meals)::DECIMAL
      ELSE 0::DECIMAL
    END as rate_per_meal,
    mm.total_meals,
    me.total_expenses,
    mmar.market_cost
  FROM month_meals mm, month_expenses me, month_market mmar;
END;
$$ LANGUAGE PLPGSQL;

-- Function to get member due amount
CREATE OR REPLACE FUNCTION public.get_member_due_amount(p_member_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  due_amount DECIMAL;
BEGIN
  SELECT COALESCE(SUM(due_amount), 0)
  INTO due_amount
  FROM public.monthly_bills
  WHERE member_id = p_member_id
    AND status != 'paid';
  
  RETURN due_amount;
END;
$$ LANGUAGE PLPGSQL;

-- Function to log activity
CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_activity_type activity_type,
  p_description TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    activity_type,
    description,
    related_id,
    old_values,
    new_values,
    created_at
  ) VALUES (
    p_user_id,
    p_activity_type,
    p_description,
    p_related_id,
    p_old_values,
    p_new_values,
    NOW()
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE PLPGSQL;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
