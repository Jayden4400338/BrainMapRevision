-- Shop purchase/equip helpers
-- Run this in Supabase SQL editor after schema + xp_coin_functions.sql

DROP FUNCTION IF EXISTS public.shop_purchase_item(INTEGER);
DROP FUNCTION IF EXISTS public.shop_equip_theme(INTEGER);
DROP FUNCTION IF EXISTS public.shop_equip_cosmetic(INTEGER);

CREATE OR REPLACE FUNCTION public.shop_purchase_item(
  target_item_id INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  new_balance INTEGER,
  purchased_item_id INTEGER,
  is_equipped BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_item_id INTEGER;
  current_user_uuid UUID;
  current_level INTEGER;
  current_coins INTEGER;
  item_price INTEGER;
  item_min_level INTEGER;
  item_category TEXT;
  item_hints INTEGER;
  spend_result RECORD;
  already_owns BOOLEAN;
  should_equip BOOLEAN;
BEGIN
  requested_item_id := target_item_id;
  current_user_uuid := auth.uid();
  IF current_user_uuid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT u.level, u.brain_coins
  INTO current_level, current_coins
  FROM public.users u
  WHERE u.id = current_user_uuid;

  IF current_level IS NULL THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  SELECT s.price, s.min_level, s.category, COALESCE((s.properties->>'hints')::INTEGER, 0)
  INTO item_price, item_min_level, item_category, item_hints
  FROM public.shop_items s
  WHERE s.id = requested_item_id
    AND s.is_active = TRUE;

  IF item_price IS NULL THEN
    RAISE EXCEPTION 'Shop item not found or inactive';
  END IF;

  IF current_level < item_min_level THEN
    RETURN QUERY
    SELECT FALSE, format('Requires level %s', item_min_level), current_coins, requested_item_id, FALSE;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_inventory ui
    WHERE ui.user_id = current_user_uuid
      AND ui.item_id = requested_item_id
  )
  INTO already_owns;

  IF already_owns THEN
    RETURN QUERY
    SELECT TRUE, 'Already owned'::TEXT, current_coins, requested_item_id, FALSE;
    RETURN;
  END IF;

  SELECT * INTO spend_result
  FROM public.spend_coins(current_user_uuid, item_price);

  IF spend_result.success IS DISTINCT FROM TRUE THEN
    RETURN QUERY
    SELECT FALSE, COALESCE(spend_result.message, 'Purchase failed'::TEXT), COALESCE(spend_result.new_balance, current_coins), requested_item_id, FALSE;
    RETURN;
  END IF;

  should_equip := FALSE;
  IF item_category = 'theme' THEN
    SELECT NOT EXISTS (
      SELECT 1
      FROM public.user_inventory ui
      JOIN public.shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = current_user_uuid
        AND ui.is_equipped = TRUE
        AND si.category = 'theme'
    )
    INTO should_equip;
  END IF;

  INSERT INTO public.user_inventory (user_id, item_id, is_equipped)
  VALUES (current_user_uuid, requested_item_id, should_equip)
  ON CONFLICT (user_id, item_id) DO NOTHING;

  IF item_category = 'hint_pack' AND item_hints > 0 THEN
    UPDATE public.users u
    SET hint_tokens = COALESCE(u.hint_tokens, 0) + item_hints,
        updated_at = NOW()
    WHERE u.id = current_user_uuid;
  END IF;

  RETURN QUERY
  SELECT TRUE, 'Purchase successful'::TEXT, spend_result.new_balance, requested_item_id, should_equip;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_purchase_item(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.shop_equip_theme(
  target_item_id INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  equipped_item_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_uuid UUID;
  owns_theme BOOLEAN;
BEGIN
  current_user_uuid := auth.uid();
  IF current_user_uuid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.user_inventory ui
    JOIN public.shop_items si ON si.id = ui.item_id
    WHERE ui.user_id = current_user_uuid
      AND ui.item_id = target_item_id
      AND si.category = 'theme'
  )
  INTO owns_theme;

  IF NOT owns_theme THEN
    RETURN QUERY SELECT FALSE, 'Theme not owned'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  UPDATE public.user_inventory ui
  SET is_equipped = CASE WHEN ui.item_id = target_item_id THEN TRUE ELSE FALSE END
  FROM public.shop_items si
  WHERE ui.user_id = current_user_uuid
    AND si.id = ui.item_id
    AND si.category = 'theme';

  RETURN QUERY SELECT TRUE, 'Theme equipped'::TEXT, target_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_equip_theme(INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.shop_equip_cosmetic(
  target_item_id INTEGER
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  equipped_item_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_uuid UUID;
  owns_cosmetic BOOLEAN;
  cosmetic_type TEXT;
BEGIN
  current_user_uuid := auth.uid();
  IF current_user_uuid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_inventory ui
      JOIN public.shop_items si ON si.id = ui.item_id
      WHERE ui.user_id = current_user_uuid
        AND ui.item_id = target_item_id
        AND si.category = 'cosmetic'
    ),
    LOWER(COALESCE(TRIM(si.properties->>'type'), 'cosmetic'))
  INTO owns_cosmetic, cosmetic_type
  FROM public.shop_items si
  WHERE si.id = target_item_id
    AND si.category = 'cosmetic'
  LIMIT 1;

  IF NOT owns_cosmetic THEN
    RETURN QUERY SELECT FALSE, 'Cosmetic not owned'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  UPDATE public.user_inventory ui
  SET is_equipped = CASE
    WHEN ui.item_id = target_item_id THEN TRUE
    WHEN LOWER(COALESCE(TRIM(si.properties->>'type'), 'cosmetic')) = COALESCE(cosmetic_type, 'cosmetic') THEN FALSE
    ELSE ui.is_equipped
  END
  FROM public.shop_items si
  WHERE ui.user_id = current_user_uuid
    AND si.id = ui.item_id
    AND si.category = 'cosmetic';

  RETURN QUERY SELECT TRUE, 'Cosmetic equipped'::TEXT, target_item_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.shop_equip_cosmetic(INTEGER) TO authenticated;
