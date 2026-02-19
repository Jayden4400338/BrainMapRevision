-- Admin tools for managing all users
-- Run this in Supabase SQL Editor.

-- 1) Ensure role supports admin
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_role_check;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_role_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_check
      CHECK (role IN ('student', 'teacher', 'admin'));
  END IF;
END $$;

-- 1b) Multi-role support (backward compatible with users.role)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['student']::TEXT[] NOT NULL;

UPDATE public.users u
SET roles = ARRAY[LOWER(COALESCE(u.role, 'student'))]
WHERE u.roles IS NULL OR CARDINALITY(u.roles) = 0;

UPDATE public.users u
SET roles = (
  SELECT ARRAY_AGG(DISTINCT r) FROM (
    SELECT LOWER(TRIM(x)) AS r
    FROM UNNEST(COALESCE(u.roles, ARRAY['student']::TEXT[])) AS x
    WHERE LOWER(TRIM(x)) IN ('student', 'teacher', 'admin')
  ) clean
)
WHERE TRUE;

UPDATE public.users u
SET roles = ARRAY['student']::TEXT[]
WHERE u.roles IS NULL OR CARDINALITY(u.roles) = 0;

CREATE OR REPLACE FUNCTION public.primary_role_from_roles(role_list TEXT[])
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN 'admin' = ANY(COALESCE(role_list, ARRAY[]::TEXT[])) THEN 'admin'
    WHEN 'teacher' = ANY(COALESCE(role_list, ARRAY[]::TEXT[])) THEN 'teacher'
    ELSE 'student'
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_roles(
  role_list TEXT[],
  fallback_role TEXT DEFAULT 'student'
)
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT r ORDER BY r) FROM (
        SELECT LOWER(TRIM(v)) AS r
        FROM UNNEST(
          COALESCE(
            role_list,
            ARRAY[LOWER(COALESCE(NULLIF(TRIM(fallback_role), ''), 'student'))]::TEXT[]
          )
        ) v
        WHERE LOWER(TRIM(v)) IN ('student', 'teacher', 'admin')
      ) allowed
    ),
    ARRAY['student']::TEXT[]
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_user_roles_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.role IS DISTINCT FROM OLD.role
     AND NEW.roles IS NOT DISTINCT FROM OLD.roles THEN
    -- Manual update of `role` only: respect it and rebuild roles[] from that value.
    NEW.roles := public.normalize_roles(ARRAY[NEW.role]::TEXT[], NEW.role);
  ELSE
    NEW.roles := public.normalize_roles(NEW.roles, NEW.role);
  END IF;

  NEW.role := public.primary_role_from_roles(NEW.roles);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_roles_columns ON public.users;
CREATE TRIGGER trg_sync_user_roles_columns
BEFORE INSERT OR UPDATE OF role, roles ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_roles_columns();

UPDATE public.users u
SET role = public.primary_role_from_roles(u.roles)
WHERE TRUE;

-- 2) Helper: check admin by auth uid
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = user_uuid
      AND (
        u.role = 'admin'
        OR 'admin' = ANY(COALESCE(u.roles, ARRAY[]::TEXT[]))
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated;

-- 3) Admin read: all users
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE(
  id UUID,
  email TEXT,
  username TEXT,
  role TEXT,
  year_group TEXT,
  xp INTEGER,
  level INTEGER,
  brain_coins INTEGER,
  hint_tokens INTEGER,
  study_streak INTEGER,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.username::TEXT,
    u.role::TEXT,
    u.year_group::TEXT,
    u.xp,
    u.level,
    u.brain_coins,
    u.hint_tokens,
    u.study_streak,
    u.last_login,
    u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users() TO authenticated;

-- 4) Admin update: user rewards/stats/role
CREATE OR REPLACE FUNCTION public.admin_update_user_stats(
  target_user_uuid UUID,
  xp_delta INTEGER DEFAULT 0,
  coin_delta INTEGER DEFAULT 0,
  hint_delta INTEGER DEFAULT 0,
  new_role TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  xp INTEGER,
  level INTEGER,
  brain_coins INTEGER,
  hint_tokens INTEGER,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_xp INTEGER;
  final_role TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF new_role IS NOT NULL AND new_role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;

  SELECT u.xp INTO current_xp
  FROM public.users u
  WHERE u.id = target_user_uuid;

  IF current_xp IS NULL THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  final_role := COALESCE(new_role, (SELECT u.role FROM public.users u WHERE u.id = target_user_uuid));

  UPDATE public.users AS u
  SET
    roles = CASE
      WHEN new_role IS NULL THEN COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[])
      ELSE (
        SELECT ARRAY_AGG(DISTINCT v) FROM (
          SELECT LOWER(TRIM(r)) AS v
          FROM UNNEST(
            COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]) || ARRAY[new_role]
          ) r
          WHERE LOWER(TRIM(r)) IN ('student', 'teacher', 'admin')
        ) allowed
      )
    END,
    xp = GREATEST(0, u.xp + COALESCE(xp_delta, 0)),
    level = public.calculate_level(GREATEST(0, u.xp + COALESCE(xp_delta, 0))),
    brain_coins = GREATEST(0, u.brain_coins + COALESCE(coin_delta, 0)),
    hint_tokens = GREATEST(0, u.hint_tokens + COALESCE(hint_delta, 0)),
    role = CASE
      WHEN new_role IS NULL THEN public.primary_role_from_roles(COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]))
      ELSE public.primary_role_from_roles(
        (
          SELECT ARRAY_AGG(DISTINCT v) FROM (
            SELECT LOWER(TRIM(r)) AS v
            FROM UNNEST(
              COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]) || ARRAY[new_role]
            ) r
            WHERE LOWER(TRIM(r)) IN ('student', 'teacher', 'admin')
          ) allowed
        )
      )
    END,
    updated_at = NOW()
  WHERE u.id = target_user_uuid;

  RETURN QUERY
  SELECT
    u.id,
    u.xp,
    u.level,
    u.brain_coins,
    u.hint_tokens,
    u.role::TEXT
  FROM public.users u
  WHERE u.id = target_user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_stats(UUID, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

-- 5) Admin question tools
CREATE OR REPLACE FUNCTION public.admin_get_recent_questions(
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id INTEGER,
  subject_slug TEXT,
  topic TEXT,
  question TEXT,
  difficulty TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    q.id,
    s.slug::TEXT,
    q.topic::TEXT,
    q.question::TEXT,
    q.difficulty::TEXT,
    q.created_at
  FROM public.quiz_questions q
  JOIN public.subjects s ON s.id = q.subject_id
  ORDER BY q.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 50), 200));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_recent_questions(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_add_quiz_question(
  subject_slug TEXT,
  topic TEXT,
  question_text TEXT,
  options_json JSONB,
  correct_answer_text TEXT,
  difficulty_text TEXT DEFAULT 'medium',
  explanation_text TEXT DEFAULT NULL
)
RETURNS TABLE(
  id INTEGER,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_subject_id INTEGER;
  cleaned_difficulty TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF COALESCE(TRIM(subject_slug), '') = '' OR COALESCE(TRIM(topic), '') = '' OR COALESCE(TRIM(question_text), '') = '' OR COALESCE(TRIM(correct_answer_text), '') = '' THEN
    RAISE EXCEPTION 'Subject, topic, question, and correct answer are required';
  END IF;

  cleaned_difficulty := LOWER(COALESCE(TRIM(difficulty_text), 'medium'));
  IF cleaned_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    RAISE EXCEPTION 'Difficulty must be easy, medium, or hard';
  END IF;

  IF jsonb_typeof(options_json) <> 'array' OR jsonb_array_length(options_json) < 2 THEN
    RAISE EXCEPTION 'Options must be a JSON array with at least 2 values';
  END IF;

  SELECT s.id INTO target_subject_id
  FROM public.subjects s
  WHERE s.slug = TRIM(subject_slug)
  LIMIT 1;

  IF target_subject_id IS NULL THEN
    RAISE EXCEPTION 'Unknown subject slug: %', subject_slug;
  END IF;

  RETURN QUERY
  INSERT INTO public.quiz_questions (
    subject_id,
    topic,
    question,
    question_type,
    options,
    correct_answer,
    explanation,
    difficulty
  )
  VALUES (
    target_subject_id,
    TRIM(topic),
    TRIM(question_text),
    'multiple_choice',
    options_json,
    TRIM(correct_answer_text),
    NULLIF(TRIM(COALESCE(explanation_text, '')), ''),
    cleaned_difficulty
  )
  RETURNING quiz_questions.id, quiz_questions.created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_quiz_question(TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_quiz_question(
  question_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  DELETE FROM public.quiz_questions q
  WHERE q.id = question_id;

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  RETURN rows_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_quiz_question(INTEGER) TO authenticated;

-- 6) Admin activity snapshot
CREATE OR REPLACE FUNCTION public.admin_get_user_activity()
RETURNS TABLE(
  id UUID,
  email TEXT,
  username TEXT,
  role TEXT,
  last_login TIMESTAMPTZ,
  minutes_since_login INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.username::TEXT,
    u.role::TEXT,
    u.last_login,
    CASE
      WHEN u.last_login IS NULL THEN NULL
      ELSE FLOOR(EXTRACT(EPOCH FROM (NOW() - u.last_login)) / 60)::INTEGER
    END AS minutes_since_login,
    CASE
      WHEN u.last_login IS NULL THEN 'offline'
      WHEN u.last_login >= NOW() - INTERVAL '15 minutes' THEN 'active'
      WHEN u.last_login >= NOW() - INTERVAL '60 minutes' THEN 'idle'
      ELSE 'offline'
    END::TEXT AS status
  FROM public.users u
  ORDER BY u.last_login DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_user_activity() TO authenticated;

-- 7) Admin analytics summary
CREATE OR REPLACE FUNCTION public.admin_get_usage_analytics()
RETURNS TABLE(
  total_users BIGINT,
  active_24h BIGINT,
  total_quizzes BIGINT,
  avg_quiz_score NUMERIC,
  total_study_minutes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.users u),
    (SELECT COUNT(*) FROM public.users u WHERE u.last_login >= NOW() - INTERVAL '24 hours'),
    (SELECT COUNT(*) FROM public.quizzes q),
    (
      SELECT COALESCE(AVG((q.score::NUMERIC / NULLIF(q.total_questions, 0)::NUMERIC) * 100), 0)
      FROM public.quizzes q
    ),
    (SELECT COALESCE(SUM(up.total_study_time), 0)::BIGINT FROM public.user_progress up);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_usage_analytics() TO authenticated;

-- 8) Admin settings helper: promote user by email
CREATE OR REPLACE FUNCTION public.admin_set_user_role_by_email(
  target_email TEXT,
  new_role TEXT DEFAULT 'admin'
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_email TEXT;
  cleaned_role TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  cleaned_email := LOWER(TRIM(COALESCE(target_email, '')));
  cleaned_role := LOWER(TRIM(COALESCE(new_role, 'admin')));

  IF cleaned_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  IF cleaned_role NOT IN ('student', 'teacher', 'admin') THEN
    RAISE EXCEPTION 'Invalid role value';
  END IF;

  UPDATE public.users u
  SET roles = (
        SELECT ARRAY_AGG(DISTINCT v) FROM (
          SELECT LOWER(TRIM(r)) AS v
          FROM UNNEST(COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]) || ARRAY[cleaned_role]) r
          WHERE LOWER(TRIM(r)) IN ('student', 'teacher', 'admin')
        ) allowed
      ),
      role = public.primary_role_from_roles(
        (
          SELECT ARRAY_AGG(DISTINCT v) FROM (
            SELECT LOWER(TRIM(r)) AS v
            FROM UNNEST(COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]) || ARRAY[cleaned_role]) r
            WHERE LOWER(TRIM(r)) IN ('student', 'teacher', 'admin')
          ) allowed
        )
      ),
      updated_at = NOW()
  WHERE LOWER(u.email) = cleaned_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found for email: %', cleaned_email;
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.role::TEXT
  FROM public.users u
  WHERE LOWER(u.email) = cleaned_email
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role_by_email(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_roles_by_email(
  target_email TEXT,
  new_roles TEXT[]
)
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  roles TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_email TEXT;
  cleaned_roles TEXT[];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  cleaned_email := LOWER(TRIM(COALESCE(target_email, '')));
  IF cleaned_email = '' THEN
    RAISE EXCEPTION 'Email is required';
  END IF;

  cleaned_roles := (
    SELECT ARRAY_AGG(DISTINCT v) FROM (
      SELECT LOWER(TRIM(r)) AS v
      FROM UNNEST(COALESCE(new_roles, ARRAY['student']::TEXT[])) r
      WHERE LOWER(TRIM(r)) IN ('student', 'teacher', 'admin')
    ) allowed
  );

  IF cleaned_roles IS NULL OR CARDINALITY(cleaned_roles) = 0 THEN
    cleaned_roles := ARRAY['student']::TEXT[];
  END IF;

  UPDATE public.users u
  SET roles = cleaned_roles,
      role = public.primary_role_from_roles(cleaned_roles),
      updated_at = NOW()
  WHERE LOWER(u.email) = cleaned_email;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found for email: %', cleaned_email;
  END IF;

  RETURN QUERY
  SELECT u.id, u.email::TEXT, u.role::TEXT, COALESCE(u.roles, ARRAY[u.role]::TEXT[])
  FROM public.users u
  WHERE LOWER(u.email) = cleaned_email
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_roles_by_email(TEXT, TEXT[]) TO authenticated;

-- 9) Admin logs table
CREATE TABLE IF NOT EXISTS public.admin_action_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  details JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action_type ON public.admin_action_logs(action_type);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'info',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created ON public.user_notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_read ON public.user_notifications(user_id, is_read);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND policyname = 'Users can read own notifications'
  ) THEN
    CREATE POLICY "Users can read own notifications" ON public.user_notifications
      FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_notifications'
      AND policyname = 'Users can update own notifications'
  ) THEN
    CREATE POLICY "Users can update own notifications" ON public.user_notifications
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_my_unread_notifications(
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE(
  id BIGINT,
  title TEXT,
  message TEXT,
  kind TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_uid UUID;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    n.title::TEXT,
    n.message::TEXT,
    n.kind::TEXT,
    COALESCE(n.metadata, '{}'::JSONB),
    n.created_at
  FROM public.user_notifications n
  WHERE n.user_id = current_uid
    AND n.is_read = FALSE
  ORDER BY n.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 5), 20));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_unread_notifications(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_my_notification_read(
  notification_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  current_uid UUID;
  rows_updated INTEGER;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_notifications n
  SET is_read = TRUE
  WHERE n.id = notification_id
    AND n.user_id = current_uid;

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_my_notification_read(BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_recent_logs(
  limit_count INTEGER DEFAULT 200
)
RETURNS TABLE(
  id BIGINT,
  action_type TEXT,
  admin_email TEXT,
  target_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    l.id,
    l.action_type::TEXT,
    au.email::TEXT AS admin_email,
    tu.email::TEXT AS target_email,
    COALESCE(l.details, '{}'::JSONB) AS details,
    l.created_at
  FROM public.admin_action_logs l
  LEFT JOIN public.users au ON au.id = l.admin_user_id
  LEFT JOIN public.users tu ON tu.id = l.target_user_id
  ORDER BY l.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 200), 500));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_recent_logs(INTEGER) TO authenticated;

-- 10) Admin shop tools
CREATE OR REPLACE FUNCTION public.admin_get_shop_items(
  limit_count INTEGER DEFAULT 100
)
RETURNS TABLE(
  id INTEGER,
  name TEXT,
  category TEXT,
  price INTEGER,
  min_level INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.name::TEXT,
    s.category::TEXT,
    s.price,
    s.min_level,
    s.is_active,
    s.created_at
  FROM public.shop_items s
  ORDER BY s.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(limit_count, 100), 300));
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_shop_items(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_add_shop_item(
  item_name TEXT,
  item_description TEXT,
  item_category TEXT,
  item_price INTEGER,
  item_min_level INTEGER DEFAULT 1,
  item_properties JSONB DEFAULT '{}'::JSONB,
  item_is_active BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(
  id INTEGER,
  name TEXT,
  category TEXT,
  price INTEGER,
  min_level INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  clean_category TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF COALESCE(TRIM(item_name), '') = '' THEN
    RAISE EXCEPTION 'Item name is required';
  END IF;

  IF COALESCE(item_price, 0) <= 0 THEN
    RAISE EXCEPTION 'Price must be greater than 0';
  END IF;

  IF COALESCE(item_min_level, 0) < 1 THEN
    RAISE EXCEPTION 'Minimum level must be at least 1';
  END IF;

  clean_category := LOWER(TRIM(COALESCE(item_category, '')));
  IF clean_category NOT IN ('theme', 'hint_pack', 'power_up', 'cosmetic') THEN
    RAISE EXCEPTION 'Invalid category value';
  END IF;

  RETURN QUERY
  INSERT INTO public.shop_items (
    name,
    description,
    category,
    price,
    min_level,
    properties,
    is_active
  )
  VALUES (
    TRIM(item_name),
    NULLIF(TRIM(COALESCE(item_description, '')), ''),
    clean_category,
    item_price,
    item_min_level,
    COALESCE(item_properties, '{}'::JSONB),
    COALESCE(item_is_active, TRUE)
  )
  RETURNING
    shop_items.id,
    shop_items.name::TEXT,
    shop_items.category::TEXT,
    shop_items.price,
    shop_items.min_level,
    shop_items.is_active;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_add_shop_item(TEXT, TEXT, TEXT, INTEGER, INTEGER, JSONB, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_shop_item_active(
  target_item_id INTEGER,
  active_state BOOLEAN
)
RETURNS TABLE(
  id INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  UPDATE public.shop_items s
  SET is_active = COALESCE(active_state, TRUE)
  WHERE s.id = target_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop item not found: %', target_item_id;
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
  VALUES (
    auth.uid(),
    NULL,
    'shop_item_set_active',
    jsonb_build_object('item_id', target_item_id, 'is_active', COALESCE(active_state, TRUE))
  );

  RETURN QUERY
  SELECT s.id, s.is_active
  FROM public.shop_items s
  WHERE s.id = target_item_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_shop_item_active(INTEGER, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_delete_shop_item(
  target_item_id INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  DELETE FROM public.shop_items s
  WHERE s.id = target_item_id;

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  IF rows_deleted > 0 THEN
    INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
    VALUES (auth.uid(), NULL, 'shop_item_delete', jsonb_build_object('item_id', target_item_id));
  END IF;
  RETURN rows_deleted > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_shop_item(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_shop_item_image(
  target_item_id INTEGER,
  new_image_url TEXT
)
RETURNS TABLE(
  id INTEGER,
  image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  UPDATE public.shop_items s
  SET image_url = NULLIF(TRIM(COALESCE(new_image_url, '')), '')
  WHERE s.id = target_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Shop item not found: %', target_item_id;
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
  VALUES (
    auth.uid(),
    NULL,
    'shop_item_set_image',
    jsonb_build_object('item_id', target_item_id, 'image_url', NULLIF(TRIM(COALESCE(new_image_url, '')), ''))
  );

  RETURN QUERY
  SELECT s.id, s.image_url::TEXT
  FROM public.shop_items s
  WHERE s.id = target_item_id
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_shop_item_image(INTEGER, TEXT) TO authenticated;

-- 11) Admin user account tools (username/profile picture/password/roles/rewards)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.admin_get_all_users_full()
RETURNS TABLE(
  id UUID,
  email TEXT,
  username TEXT,
  role TEXT,
  roles TEXT[],
  profile_picture_url TEXT,
  year_group TEXT,
  xp INTEGER,
  level INTEGER,
  brain_coins INTEGER,
  hint_tokens INTEGER,
  study_streak INTEGER,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.username::TEXT,
    u.role::TEXT,
    COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]),
    u.profile_picture_url::TEXT,
    u.year_group::TEXT,
    u.xp,
    u.level,
    u.brain_coins,
    u.hint_tokens,
    u.study_streak,
    u.last_login,
    u.created_at
  FROM public.users u
  ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_users_full() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_user_account(
  target_user_uuid UUID,
  new_username TEXT DEFAULT NULL,
  new_profile_picture_url TEXT DEFAULT NULL,
  new_roles TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  username TEXT,
  role TEXT,
  roles TEXT[],
  profile_picture_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cleaned_username TEXT;
  cleaned_roles TEXT[];
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  cleaned_username := NULLIF(TRIM(COALESCE(new_username, '')), '');
  IF cleaned_username IS NOT NULL THEN
    IF LENGTH(cleaned_username) < 3 OR LENGTH(cleaned_username) > 50 THEN
      RAISE EXCEPTION 'Username must be between 3 and 50 characters';
    END IF;
    IF cleaned_username !~ '^[A-Za-z0-9_]+$' THEN
      RAISE EXCEPTION 'Username may only include letters, numbers, underscores';
    END IF;
  END IF;

  IF new_roles IS NOT NULL THEN
    cleaned_roles := (
      SELECT ARRAY_AGG(DISTINCT v ORDER BY v) FROM (
        SELECT LOWER(TRIM(r)) AS v
        FROM UNNEST(new_roles) r
        WHERE LOWER(TRIM(r)) IN ('student', 'teacher', 'admin')
      ) allowed
    );
    IF cleaned_roles IS NULL OR CARDINALITY(cleaned_roles) = 0 THEN
      cleaned_roles := ARRAY['student']::TEXT[];
    END IF;
  END IF;

  UPDATE public.users u
  SET
    username = COALESCE(cleaned_username, u.username),
    profile_picture_url = CASE
      WHEN new_profile_picture_url IS NULL THEN u.profile_picture_url
      ELSE NULLIF(TRIM(COALESCE(new_profile_picture_url, '')), '')
    END,
    roles = COALESCE(cleaned_roles, u.roles),
    role = CASE
      WHEN cleaned_roles IS NULL THEN u.role
      ELSE public.primary_role_from_roles(cleaned_roles)
    END,
    updated_at = NOW()
  WHERE u.id = target_user_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
  VALUES (
    auth.uid(),
    target_user_uuid,
    'user_account_update',
    jsonb_build_object(
      'username', COALESCE(cleaned_username, '<unchanged>'),
      'profile_picture_url', CASE WHEN new_profile_picture_url IS NULL THEN '<unchanged>' ELSE NULLIF(TRIM(COALESCE(new_profile_picture_url, '')), '') END,
      'roles', COALESCE(to_jsonb(cleaned_roles), 'null'::JSONB)
    )
  );

  RETURN QUERY
  SELECT
    u.id,
    u.username::TEXT,
    u.role::TEXT,
    COALESCE(u.roles, ARRAY[COALESCE(u.role, 'student')]::TEXT[]),
    u.profile_picture_url::TEXT
  FROM public.users u
  WHERE u.id = target_user_uuid
  LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_update_user_account(UUID, TEXT, TEXT, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_user_rewards(
  target_user_uuid UUID,
  xp_amount INTEGER DEFAULT 0,
  coin_amount INTEGER DEFAULT 0,
  hint_amount INTEGER DEFAULT 0,
  note TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  xp INTEGER,
  level INTEGER,
  brain_coins INTEGER,
  hint_tokens INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  UPDATE public.users u
  SET xp = GREATEST(0, u.xp + COALESCE(xp_amount, 0)),
      level = public.calculate_level(GREATEST(0, u.xp + COALESCE(xp_amount, 0))),
      brain_coins = GREATEST(0, u.brain_coins + COALESCE(coin_amount, 0)),
      hint_tokens = GREATEST(0, u.hint_tokens + COALESCE(hint_amount, 0)),
      updated_at = NOW()
  WHERE u.id = target_user_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
  VALUES (
    auth.uid(),
    target_user_uuid,
    'grant_rewards',
    jsonb_build_object(
      'xp', COALESCE(xp_amount, 0),
      'coins', COALESCE(coin_amount, 0),
      'hints', COALESCE(hint_amount, 0),
      'note', NULLIF(TRIM(COALESCE(note, '')), '')
    )
  );

  INSERT INTO public.user_notifications (user_id, title, message, kind, metadata)
  VALUES (
    target_user_uuid,
    'Rewards Granted',
    format('You received rewards: +%s XP, +%s coins, +%s hints.', COALESCE(xp_amount, 0), COALESCE(coin_amount, 0), COALESCE(hint_amount, 0)),
    'reward',
    jsonb_build_object('xp', COALESCE(xp_amount, 0), 'coins', COALESCE(coin_amount, 0), 'hints', COALESCE(hint_amount, 0), 'note', NULLIF(TRIM(COALESCE(note, '')), ''))
  );

  RETURN QUERY
  SELECT u.id, u.xp, u.level, u.brain_coins, u.hint_tokens
  FROM public.users u
  WHERE u.id = target_user_uuid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_user_rewards(UUID, INTEGER, INTEGER, INTEGER, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_shop_item(
  target_user_uuid UUID,
  target_item_id INTEGER,
  auto_equip BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  granted_item_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item_name TEXT;
  item_category TEXT;
  item_hints INTEGER;
  owns_item BOOLEAN;
  cosmetic_type TEXT;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  SELECT
    s.name::TEXT,
    s.category::TEXT,
    COALESCE((s.properties->>'hints')::INTEGER, 0),
    LOWER(COALESCE(TRIM(s.properties->>'type'), ''))
  INTO item_name, item_category, item_hints, cosmetic_type
  FROM public.shop_items s
  WHERE s.id = target_item_id
  LIMIT 1;

  IF item_name IS NULL THEN
    RAISE EXCEPTION 'Shop item not found: %', target_item_id;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_inventory ui
    WHERE ui.user_id = target_user_uuid
      AND ui.item_id = target_item_id
  ) INTO owns_item;

  IF owns_item THEN
    RETURN QUERY SELECT TRUE, 'User already owns this item'::TEXT, target_item_id;
    RETURN;
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id, is_equipped)
  VALUES (target_user_uuid, target_item_id, FALSE);

  IF item_category = 'hint_pack' AND item_hints > 0 THEN
    UPDATE public.users u
    SET hint_tokens = GREATEST(0, COALESCE(u.hint_tokens, 0) + item_hints),
        updated_at = NOW()
    WHERE u.id = target_user_uuid;
  END IF;

  IF auto_equip IS TRUE THEN
    IF item_category = 'theme' THEN
      UPDATE public.user_inventory ui
      SET is_equipped = CASE WHEN ui.item_id = target_item_id THEN TRUE ELSE FALSE END
      FROM public.shop_items si
      WHERE ui.user_id = target_user_uuid
        AND si.id = ui.item_id
        AND si.category = 'theme';
    ELSIF item_category = 'cosmetic' THEN
      UPDATE public.user_inventory ui
      SET is_equipped = CASE
        WHEN ui.item_id = target_item_id THEN TRUE
        WHEN LOWER(COALESCE(TRIM(si.properties->>'type'), '')) = COALESCE(cosmetic_type, '') THEN FALSE
        ELSE ui.is_equipped
      END
      FROM public.shop_items si
      WHERE ui.user_id = target_user_uuid
        AND si.id = ui.item_id
        AND si.category = 'cosmetic';
    END IF;
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
  VALUES (
    auth.uid(),
    target_user_uuid,
    'grant_shop_item',
    jsonb_build_object('item_id', target_item_id, 'item_name', item_name, 'category', item_category, 'auto_equip', COALESCE(auto_equip, FALSE))
  );

  INSERT INTO public.user_notifications (user_id, title, message, kind, metadata)
  VALUES (
    target_user_uuid,
    'Shop Item Granted',
    format('You received: %s', item_name),
    'shop_grant',
    jsonb_build_object('item_id', target_item_id, 'item_name', item_name, 'category', item_category, 'auto_equip', COALESCE(auto_equip, FALSE))
  );

  RETURN QUERY SELECT TRUE, 'Item granted'::TEXT, target_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_shop_item(UUID, INTEGER, BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_user_uuid UUID,
  new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  IF COALESCE(LENGTH(new_password), 0) < 8 THEN
    RAISE EXCEPTION 'Password must be at least 8 characters';
  END IF;

  UPDATE auth.users au
  SET encrypted_password = crypt(new_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE au.id = target_user_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target auth user not found';
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action_type, details)
  VALUES (
    auth.uid(),
    target_user_uuid,
    'user_password_set',
    jsonb_build_object('password_length', LENGTH(new_password))
  );

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_password(UUID, TEXT) TO authenticated;
