-- XP and Brain Coins management functions
-- Run this FOURTH in Supabase SQL Editor

-- ============================================
-- INCREMENT XP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION increment_xp(
    user_uuid UUID,
    xp_amount INTEGER
) 
RETURNS TABLE(
    new_xp INTEGER, 
    new_level INTEGER, 
    leveled_up BOOLEAN,
    coins_earned INTEGER
) AS $$
DECLARE
    current_xp INTEGER;
    current_level INTEGER;
    current_coins INTEGER;
    new_total_xp INTEGER;
    calculated_level INTEGER;
    level_difference INTEGER;
    bonus_coins INTEGER := 0;
BEGIN
    -- Get current stats
    SELECT xp, level, brain_coins 
    INTO current_xp, current_level, current_coins
    FROM users 
    WHERE id = user_uuid;
    
    -- Calculate new XP
    new_total_xp := current_xp + xp_amount;
    
    -- Calculate new level
    calculated_level := calculate_level(new_total_xp);
    
    -- Calculate level difference
    level_difference := calculated_level - current_level;
    
    -- Award bonus coins for level up (50 coins per level)
    IF level_difference > 0 THEN
        bonus_coins := level_difference * 50;
    END IF;
    
    -- Update user stats
    UPDATE users
    SET 
        xp = new_total_xp,
        level = calculated_level,
        brain_coins = current_coins + bonus_coins,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Return results
    RETURN QUERY
    SELECT 
        new_total_xp,
        calculated_level,
        (calculated_level > current_level),
        bonus_coins;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_xp(UUID, INTEGER) TO authenticated;

-- ============================================
-- AWARD COINS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION award_coins(
    user_uuid UUID,
    coin_amount INTEGER
) 
RETURNS TABLE(
    new_balance INTEGER,
    amount_awarded INTEGER
) AS $$
DECLARE
    current_coins INTEGER;
    new_total_coins INTEGER;
BEGIN
    -- Get current coin balance
    SELECT brain_coins 
    INTO current_coins
    FROM users 
    WHERE id = user_uuid;
    
    -- Calculate new balance
    new_total_coins := current_coins + coin_amount;
    
    -- Update user coins
    UPDATE users
    SET 
        brain_coins = new_total_coins,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Return results
    RETURN QUERY
    SELECT 
        new_total_coins,
        coin_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION award_coins(UUID, INTEGER) TO authenticated;

-- ============================================
-- SPEND COINS FUNCTION (for shop purchases)
-- ============================================
CREATE OR REPLACE FUNCTION spend_coins(
    user_uuid UUID,
    coin_amount INTEGER
) 
RETURNS TABLE(
    success BOOLEAN,
    new_balance INTEGER,
    message TEXT
) AS $$
DECLARE
    current_coins INTEGER;
    new_total_coins INTEGER;
BEGIN
    -- Get current coin balance
    SELECT brain_coins 
    INTO current_coins
    FROM users 
    WHERE id = user_uuid;
    
    -- Check if user has enough coins
    IF current_coins < coin_amount THEN
        RETURN QUERY
        SELECT 
            FALSE,
            current_coins,
            'Insufficient coins'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new balance
    new_total_coins := current_coins - coin_amount;
    
    -- Update user coins
    UPDATE users
    SET 
        brain_coins = new_total_coins,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Return success
    RETURN QUERY
    SELECT 
        TRUE,
        new_total_coins,
        'Purchase successful'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION spend_coins(UUID, INTEGER) TO authenticated;