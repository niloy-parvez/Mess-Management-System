-- 004_create_missing_tables.sql
-- Idempotent creation of meals, market, and notifications tables if they do not exist.

-- MEALS TABLE
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  meal_type meal_type NOT NULL,
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_meal_per_day UNIQUE (member_id, meal_type, meal_date)
);

-- Indexes for meals
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_meals_member_id') THEN
    CREATE INDEX idx_meals_member_id ON public.meals(member_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_meals_meal_date') THEN
    CREATE INDEX idx_meals_meal_date ON public.meals(meal_date);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_meals_meal_type') THEN
    CREATE INDEX idx_meals_meal_type ON public.meals(meal_type);
  END IF;
END$$;

-- MARKET TABLE
CREATE TABLE IF NOT EXISTS public.market (
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
  CONSTRAINT valid_approval CHECK (
    (is_approved AND approved_by IS NOT NULL AND approved_at IS NOT NULL) OR
    NOT is_approved
  )
);

-- Indexes for market
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_market_market_date') THEN
    CREATE INDEX idx_market_market_date ON public.market(market_date DESC);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_market_is_approved') THEN
    CREATE INDEX idx_market_is_approved ON public.market(is_approved);
  END IF;
END$$;

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
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
  CONSTRAINT valid_read_timestamp CHECK (
    (is_read AND read_at IS NOT NULL) OR
    NOT is_read
  )
);

-- Indexes for notifications
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_notifications_user_id') THEN
    CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = 'idx_notifications_is_read') THEN
    CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
  END IF;
END$$;

-- Ensure triggers exist will be created by existing trigger function in original migration if present.

-- End of 004_create_missing_tables.sql
