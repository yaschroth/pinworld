-- Extraction usage tracking table
CREATE TABLE extraction_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_month DATE NOT NULL, -- First day of the month
  extraction_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, usage_month)
);

-- Index for fast lookups
CREATE INDEX extraction_usage_user_month_idx ON extraction_usage(user_id, usage_month);

-- Row Level Security
ALTER TABLE extraction_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage"
  ON extraction_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if user can extract (returns usage info)
CREATE OR REPLACE FUNCTION can_user_extract(p_user_id UUID)
RETURNS TABLE(can_extract BOOLEAN, current_count INTEGER, monthly_limit INTEGER, tier TEXT) AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Get current usage
  SELECT COALESCE(extraction_count, 0) INTO v_count
  FROM extraction_usage
  WHERE user_id = p_user_id AND usage_month = v_month;

  IF v_count IS NULL THEN
    v_count := 0;
  END IF;

  -- Determine limit (pro = unlimited represented as -1)
  IF v_tier = 'pro' THEN
    v_limit := -1;
    RETURN QUERY SELECT TRUE, v_count, v_limit, v_tier;
  ELSE
    v_limit := 5;
    RETURN QUERY SELECT v_count < v_limit, v_count, v_limit, v_tier;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment usage after successful extraction
CREATE OR REPLACE FUNCTION increment_extraction_usage(p_user_id UUID)
RETURNS TABLE(new_count INTEGER, limit_reached BOOLEAN) AS $$
DECLARE
  v_month DATE := date_trunc('month', CURRENT_DATE)::DATE;
  v_new_count INTEGER;
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT subscription_tier INTO v_tier
  FROM user_profiles
  WHERE id = p_user_id;

  IF v_tier = 'pro' THEN
    v_limit := -1;
  ELSE
    v_limit := 5;
  END IF;

  -- Upsert usage record
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
