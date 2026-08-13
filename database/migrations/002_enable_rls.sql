-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR MESS MANAGEMENT SYSTEM
-- Version: 1.1.0
-- Purpose: Secure data access with RLS policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.migration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csrf_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION: GET CURRENT USER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auth_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE PLPGSQL STABLE;

-- ============================================================================
-- HELPER FUNCTION: IS ADMIN
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  user_role user_role;
  auth_role_text TEXT;
BEGIN
  -- Prefer role from public.users profile table if present
  SELECT role INTO user_role
  FROM public.users
  WHERE auth_id = auth.uid();

  IF user_role IS NOT NULL THEN
    RETURN user_role = 'admin';
  END IF;

  -- Fallback: check Supabase Auth metadata for role (user_metadata->>'role')
  BEGIN
    SELECT user_metadata->>'role' INTO auth_role_text FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    auth_role_text := NULL;
  END;

  RETURN (auth_role_text = 'admin');
END;
$$ LANGUAGE PLPGSQL STABLE;

-- ============================================================================
-- USERS TABLE RLS POLICIES
-- ============================================================================

-- Admins can see all users
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (public.is_admin());

-- Members can see only themselves
CREATE POLICY "Members can view themselves"
ON public.users FOR SELECT
USING (auth_id = auth.uid());

-- Only admins can insert users
CREATE POLICY "Only admins can create users"
ON public.users FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update users
CREATE POLICY "Only admins can update users"
ON public.users FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete users
CREATE POLICY "Only admins can delete users"
ON public.users FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- MEMBERS TABLE RLS POLICIES
-- ============================================================================

-- Everyone can see active members
CREATE POLICY "Everyone can view active members"
ON public.members FOR SELECT
USING (is_active = TRUE OR public.is_admin());

-- Members can see only soft-deleted if they are admin or the member
CREATE POLICY "Admins can view deleted members"
ON public.members FOR SELECT
USING (public.is_admin());

-- Members can see themselves
CREATE POLICY "Members can view themselves"
ON public.members FOR SELECT
USING (
  is_active = TRUE AND (
    user_id = public.auth_user_id() OR
    public.is_admin()
  )
);

-- Only admins can insert members
CREATE POLICY "Only admins can create members"
ON public.members FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update members
CREATE POLICY "Only admins can update members"
ON public.members FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete members
CREATE POLICY "Only admins can delete members"
ON public.members FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- MEALS TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view meals of active members
CREATE POLICY "Everyone can view active members meals"
ON public.meals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_id AND m.is_active = TRUE
  )
);

-- Members can only see their own meals
CREATE POLICY "Members can only view their own meals"
ON public.meals FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_id 
      AND (m.user_id = public.auth_user_id() OR public.is_admin())
  )
);

-- Only admins and the member can add meals
CREATE POLICY "Members and admins can record meals"
ON public.meals FOR INSERT
WITH CHECK (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_id AND m.user_id = public.auth_user_id()
  )
);

-- Only admins can update meals
CREATE POLICY "Only admins can update meals"
ON public.meals FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete meals
CREATE POLICY "Only admins can delete meals"
ON public.meals FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- MARKET TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view market entries
CREATE POLICY "Everyone can view market entries"
ON public.market FOR SELECT
USING (TRUE);

-- Only admins can create market entries
CREATE POLICY "Only admins can create market entries"
ON public.market FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update market entries
CREATE POLICY "Only admins can update market entries"
ON public.market FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete market entries
CREATE POLICY "Only admins can delete market entries"
ON public.market FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- EXPENSES TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view expenses
CREATE POLICY "Everyone can view expenses"
ON public.expenses FOR SELECT
USING (TRUE);

-- Only admins can create expenses
CREATE POLICY "Only admins can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update expenses
CREATE POLICY "Only admins can update expenses"
ON public.expenses FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete expenses
CREATE POLICY "Only admins can delete expenses"
ON public.expenses FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- PAYMENTS TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view payments
CREATE POLICY "Everyone can view payments"
ON public.payments FOR SELECT
USING (TRUE);

-- Members can only see their own payments
CREATE POLICY "Members can only view their payments"
ON public.payments FOR SELECT
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_id AND m.user_id = public.auth_user_id()
  )
);

-- Only admins can create payments
CREATE POLICY "Only admins can create payments"
ON public.payments FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update payments
CREATE POLICY "Only admins can update payments"
ON public.payments FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete payments
CREATE POLICY "Only admins can delete payments"
ON public.payments FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- NOTICES TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view notices (not archived)
CREATE POLICY "Everyone can view notices"
ON public.notices FOR SELECT
USING (is_archived = FALSE OR public.is_admin());

-- Only admins can create notices
CREATE POLICY "Only admins can create notices"
ON public.notices FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update notices
CREATE POLICY "Only admins can update notices"
ON public.notices FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete notices
CREATE POLICY "Only admins can delete notices"
ON public.notices FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS TABLE RLS POLICIES
-- ============================================================================

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (user_id = public.auth_user_id());

-- System only (service role) can create notifications
CREATE POLICY "Only system can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (TRUE);

-- Users can update their own notifications
CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (user_id = public.auth_user_id())
WITH CHECK (user_id = public.auth_user_id());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (user_id = public.auth_user_id());

-- ============================================================================
-- SETTINGS TABLE RLS POLICIES
-- ============================================================================

-- Only admins can view settings
CREATE POLICY "Only admins can view settings"
ON public.settings FOR SELECT
USING (public.is_admin());

-- Only admins can create settings
CREATE POLICY "Only admins can create settings"
ON public.settings FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update settings
CREATE POLICY "Only admins can update settings"
ON public.settings FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete settings
CREATE POLICY "Only admins can delete settings"
ON public.settings FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- ACTIVITY LOGS TABLE RLS POLICIES
-- ============================================================================

-- Only admins can view activity logs
CREATE POLICY "Only admins can view activity logs"
ON public.activity_logs FOR SELECT
USING (public.is_admin());

-- System only can create activity logs
CREATE POLICY "System can create activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (TRUE);

-- ============================================================================
-- MARKET LOCKS TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view market locks
CREATE POLICY "Everyone can view market locks"
ON public.market_locks FOR SELECT
USING (TRUE);

-- Only admins can create market locks
CREATE POLICY "Only admins can create market locks"
ON public.market_locks FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update market locks
CREATE POLICY "Only admins can update market locks"
ON public.market_locks FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete market locks
CREATE POLICY "Only admins can delete market locks"
ON public.market_locks FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- BACKUPS TABLE RLS POLICIES
-- ============================================================================

-- Only admins can view backups
CREATE POLICY "Only admins can view backups"
ON public.backups FOR SELECT
USING (public.is_admin());

-- Only admins can create backups
CREATE POLICY "Only admins can create backups"
ON public.backups FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update backups
CREATE POLICY "Only admins can update backups"
ON public.backups FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Only admins can delete backups
CREATE POLICY "Only admins can delete backups"
ON public.backups FOR DELETE
USING (public.is_admin());

-- ============================================================================
-- BACKUP LOGS TABLE RLS POLICIES
-- ============================================================================

-- Only admins can view backup logs
CREATE POLICY "Only admins can view backup logs"
ON public.backup_logs FOR SELECT
USING (public.is_admin());

-- Only admins can create backup logs
CREATE POLICY "Only admins can create backup logs"
ON public.backup_logs FOR INSERT
WITH CHECK (public.is_admin());

-- ============================================================================
-- MIGRATION LOGS TABLE RLS POLICIES
-- ============================================================================

-- Only admins can view migration logs
CREATE POLICY "Only admins can view migration logs"
ON public.migration_logs FOR SELECT
USING (public.is_admin());

-- Only admins can create migration logs
CREATE POLICY "Only admins can create migration logs"
ON public.migration_logs FOR INSERT
WITH CHECK (public.is_admin());

-- ============================================================================
-- MEAL RATES TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view meal rates
CREATE POLICY "Everyone can view meal rates"
ON public.meal_rates FOR SELECT
USING (TRUE);

-- Only admins can create meal rates
CREATE POLICY "Only admins can create meal rates"
ON public.meal_rates FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update meal rates
CREATE POLICY "Only admins can update meal rates"
ON public.meal_rates FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- MONTHLY BILLS TABLE RLS POLICIES
-- ============================================================================

-- Everyone can view monthly bills
CREATE POLICY "Everyone can view monthly bills"
ON public.monthly_bills FOR SELECT
USING (TRUE);

-- Members can only see their own bills
CREATE POLICY "Members can only view their bills"
ON public.monthly_bills FOR SELECT
USING (
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.members m
    WHERE m.id = member_id AND m.user_id = public.auth_user_id()
  )
);

-- Only admins can create monthly bills
CREATE POLICY "Only admins can create monthly bills"
ON public.monthly_bills FOR INSERT
WITH CHECK (public.is_admin());

-- Only admins can update monthly bills
CREATE POLICY "Only admins can update monthly bills"
ON public.monthly_bills FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ============================================================================
-- PASSWORD RESET TOKENS TABLE RLS POLICIES
-- ============================================================================

-- Users can only see their own tokens
CREATE POLICY "Users can view their own password reset tokens"
ON public.password_reset_tokens FOR SELECT
USING (user_id = public.auth_user_id());

-- System only can create tokens
CREATE POLICY "System can create password reset tokens"
ON public.password_reset_tokens FOR INSERT
WITH CHECK (TRUE);

-- Users can only update their own tokens
CREATE POLICY "Users can update their password reset tokens"
ON public.password_reset_tokens FOR UPDATE
USING (user_id = public.auth_user_id())
WITH CHECK (user_id = public.auth_user_id());

-- ============================================================================
-- CSRF TOKENS TABLE RLS POLICIES
-- ============================================================================

-- System only can access CSRF tokens
CREATE POLICY "System can access CSRF tokens"
ON public.csrf_tokens FOR ALL
USING (TRUE);

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
