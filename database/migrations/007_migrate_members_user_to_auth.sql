-- 007_migrate_members_user_to_auth.sql
-- Safely migrate members.user_id to reference auth.users(id) when possible
-- This migration assumes you have a backup and will run idempotently.

BEGIN;

-- 1) Add a new nullable staging column auth_user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'auth_user_id'
  ) THEN
    ALTER TABLE public.members ADD COLUMN auth_user_id uuid NULL;
  END IF;
END$$;

-- 2) Backfill auth_user_id from public.users.auth_id when present
-- Only update rows where auth_user_id IS NULL
UPDATE public.members m
SET auth_user_id = u.auth_id
FROM public.users u
WHERE m.auth_user_id IS NULL
  AND u.auth_id IS NOT NULL
  AND (m.user_id::text = u.id::text OR m.user_id::text = u.auth_id::text OR u.auth_id::text = m.user_id::text);

-- 3) For rows where user_id already equals an auth.users.id, set auth_user_id=user_id
UPDATE public.members
SET auth_user_id = user_id
WHERE auth_user_id IS NULL
  AND user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM auth.users a WHERE a.id::text = public.members.user_id::text);

-- 4) Add FK constraint to auth.users on auth_user_id (not valid initially to avoid locking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE c.contype = 'f' AND t.relname = 'members' AND c.conkey::text LIKE '%(auth_user_id)%'
  ) THEN
    ALTER TABLE public.members
      ADD CONSTRAINT fk_members_auth_user_id FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE SET NULL NOT VALID;
  END IF;
END$$;

-- 5) Validate the constraint if all rows satisfy it
DO $$
DECLARE
  invalid_count bigint;
BEGIN
  SELECT count(*) INTO invalid_count FROM public.members m WHERE m.auth_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.users a WHERE a.id = m.auth_user_id);
  IF invalid_count = 0 THEN
    BEGIN
      ALTER TABLE public.members VALIDATE CONSTRAINT fk_members_auth_user_id;
    EXCEPTION WHEN others THEN
      RAISE NOTICE 'Could not validate constraint now: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'Not validating fk_members_auth_user_id: % rows would violate (manual review required)', invalid_count;
  END IF;
END$$;

-- 6) If fk_members_user_auth exists (legacy), keep it or drop if desired - do not drop automatically here to avoid breaking systems.
-- This migration intentionally avoids dropping the legacy members.user_id foreign key.
-- After verification, a follow-up migration can safely drop the old FK and rename auth_user_id -> user_id.

COMMIT;

-- End of migration 007
