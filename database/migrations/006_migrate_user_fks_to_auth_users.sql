-- 006_migrate_user_fks_to_auth_users.sql
-- Safely migrate foreign keys that reference public.users to reference auth.users instead.
-- This migration is idempotent and will attempt to drop existing FKs that reference public.users
-- and recreate them to point to auth.users(id).

DO $$
DECLARE
  cname TEXT;
BEGIN
  -- members.user_id FK
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON con.conrelid = rel.oid
  JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
  JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
  WHERE rel.relname = 'members' AND att.attname = 'user_id' AND con.contype = 'f'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    RAISE NOTICE 'Dropping constraint % on members', cname;
    EXECUTE format('ALTER TABLE public.members DROP CONSTRAINT %I', cname);
  END IF;

  -- Add new constraint referencing auth.users
  BEGIN
    ALTER TABLE public.members ADD CONSTRAINT fk_members_user_auth FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN
    -- constraint already exists, ignore
    NULL;
  END;

  -- notifications.user_id FK
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON con.conrelid = rel.oid
  JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
  WHERE rel.relname = 'notifications' AND att.attname = 'user_id' AND con.contype = 'f'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    RAISE NOTICE 'Dropping constraint % on notifications', cname;
    EXECUTE format('ALTER TABLE public.notifications DROP CONSTRAINT %I', cname);
  END IF;

  BEGIN
    ALTER TABLE public.notifications ADD CONSTRAINT fk_notifications_user_auth FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  -- market.approved_by and market.created_by
  FOR cname IN SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
    WHERE rel.relname = 'market' AND att.attname IN ('approved_by','created_by') AND con.contype = 'f'
  LOOP
    RAISE NOTICE 'Dropping constraint % on market', cname;
    EXECUTE format('ALTER TABLE public.market DROP CONSTRAINT %I', cname);
  END LOOP;

  BEGIN
    ALTER TABLE public.market ADD CONSTRAINT fk_market_approved_by_auth FOREIGN KEY (approved_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE public.market ADD CONSTRAINT fk_market_created_by_auth FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- expenses.created_by
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON con.conrelid = rel.oid
  JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
  WHERE rel.relname = 'expenses' AND att.attname = 'created_by' AND con.contype = 'f'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    RAISE NOTICE 'Dropping constraint % on expenses', cname;
    EXECUTE format('ALTER TABLE public.expenses DROP CONSTRAINT %I', cname);
  END IF;

  BEGIN
    ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_created_by_auth FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- payments.created_by and payments.verified_by
  FOR cname IN SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
    JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
    WHERE rel.relname = 'payments' AND att.attname IN ('created_by','verified_by') AND con.contype = 'f'
  LOOP
    RAISE NOTICE 'Dropping constraint % on payments', cname;
    EXECUTE format('ALTER TABLE public.payments DROP CONSTRAINT %I', cname);
  END LOOP;

  BEGIN
    ALTER TABLE public.payments ADD CONSTRAINT fk_payments_created_by_auth FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER TABLE public.payments ADD CONSTRAINT fk_payments_verified_by_auth FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- notices.created_by
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON con.conrelid = rel.oid
  JOIN unnest(con.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
  JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = cols.attnum
  WHERE rel.relname = 'notices' AND att.attname = 'created_by' AND con.contype = 'f'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    RAISE NOTICE 'Dropping constraint % on notices', cname;
    EXECUTE format('ALTER TABLE public.notices DROP CONSTRAINT %I', cname);
  END IF;

  BEGIN
    ALTER TABLE public.notices ADD CONSTRAINT fk_notices_created_by_auth FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

END$$;

-- End of migration
