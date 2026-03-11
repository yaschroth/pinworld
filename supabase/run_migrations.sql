-- Run this in Supabase Dashboard > SQL Editor
-- This creates the subscription and usage tracking tables

-- ============================================
-- 1. User Profiles Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE,
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro')),
  subscription_status TEXT DEFAULT 'active' CHECK (subscription_status IN ('active', 'canceled', 'past_due', 'trialing')),
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE INDEX IF NOT EXISTS user_profiles_stripe_customer_idx ON user_profiles(stripe_customer_id);

-- Create profiles for existing users
INSERT INTO user_profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. Extraction Usage Table
-- ============================================
CREATE TABLE IF NOT EXISTS extraction_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_month DATE NOT NULL,
  extraction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, usage_month)
);

CREATE INDEX IF NOT EXISTS extraction_usage_user_month_idx ON extraction_usage(user_id, usage_month);

ALTER TABLE extraction_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own usage" ON extraction_usage;
CREATE POLICY "Users can view own usage"
  ON extraction_usage FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Check if user can extract
CREATE OR REPLACE FUNCTION can_user_extract(p_user_id UUID)
RETURNS TABLE(can_extract BOOLEAN, current_count INTEGER, monthly_limit INTEGER, tier TEXT) AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  SELECT COALESCE(extraction_count, 0) INTO v_count
  FROM extraction_usage
  WHERE user_id = p_user_id AND usage_month = v_month;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  IF v_tier = 'pro' THEN
    v_limit := -1;
    RETURN QUERY SELECT TRUE, v_count, v_limit, v_tier;
  ELSE
    v_limit := 5;
    RETURN QUERY SELECT v_count < v_limit, v_count, v_limit, v_tier;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment usage after extraction
CREATE OR REPLACE FUNCTION increment_extraction_usage(p_user_id UUID)
RETURNS TABLE(new_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_new_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  SELECT subscription_tier INTO v_tier
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_tier = 'pro' THEN
    v_limit := -1;
  ELSE
    v_limit := 5;
  END IF;

  INSERT INTO extraction_usage (user_id, usage_month, extraction_count)
  VALUES (p_user_id, v_month, 1)
  ON CONFLICT (user_id, usage_month)
  DO UPDATE SET
    extraction_count = extraction_usage.extraction_count + 1,
    updated_at = now()
  RETURNING extraction_count INTO v_new_count;

  RETURN QUERY SELECT
    v_new_count,
    CASE WHEN v_limit = -1 THEN FALSE ELSE v_new_count > v_limit END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
