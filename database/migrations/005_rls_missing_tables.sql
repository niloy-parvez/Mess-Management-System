-- 005_rls_missing_tables.sql
-- Conditionally create RLS policies for meals, market, notifications if they don't exist

-- MEALS TABLE POLICIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'everyone_can_view_active_members_meals') THEN
    EXECUTE $$
      CREATE POLICY "Everyone can view active members meals"
      ON public.meals FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id AND m.is_active = TRUE
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'members_can_only_view_their_own_meals') THEN
    EXECUTE $$
      CREATE POLICY "Members can only view their own meals"
      ON public.meals FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id 
            AND (m.user_id = public.auth_user_id() OR public.is_admin())
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'members_and_admins_can_record_meals') THEN
    EXECUTE $$
      CREATE POLICY "Members and admins can record meals"
      ON public.meals FOR INSERT
      WITH CHECK (
        public.is_admin() OR
        EXISTS (
          SELECT 1 FROM public.members m
          WHERE m.id = member_id AND m.user_id = public.auth_user_id()
        )
      );
    $$;
  END IF;
END$$;

-- MARKET TABLE POLICIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'everyone_can_view_market_entries') THEN
    EXECUTE $$
      CREATE POLICY "Everyone can view market entries"
      ON public.market FOR SELECT
      USING (TRUE);
    $$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'only_admins_can_create_market_entries') THEN
    EXECUTE $$
      CREATE POLICY "Only admins can create market entries"
      ON public.market FOR INSERT
      WITH CHECK (public.is_admin());
    $$;
  END IF;
END$$;

-- NOTIFICATIONS TABLE POLICIES
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'users_can_view_their_own_notifications') THEN
    EXECUTE $$
      CREATE POLICY "Users can view their own notifications"
      ON public.notifications FOR SELECT
      USING (user_id = public.auth_user_id());
    $$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'only_system_can_create_notifications') THEN
    EXECUTE $$
      CREATE POLICY "Only system can create notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (TRUE);
    $$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'users_can_update_their_own_notifications') THEN
    EXECUTE $$
      CREATE POLICY "Users can update their own notifications"
      ON public.notifications FOR UPDATE
      USING (user_id = public.auth_user_id())
      WITH CHECK (user_id = public.auth_user_id());
    $$;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE polname = 'users_can_delete_their_own_notifications') THEN
    EXECUTE $$
      CREATE POLICY "Users can delete their own notifications"
      ON public.notifications FOR DELETE
      USING (user_id = public.auth_user_id());
    $$;
  END IF;
END$$;

-- End of 005_rls_missing_tables.sql
