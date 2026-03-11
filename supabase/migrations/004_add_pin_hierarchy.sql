-- Add hierarchy support to pins table
ALTER TABLE pins ADD COLUMN parent_id UUID REFERENCES pins(id) ON DELETE CASCADE;
ALTER TABLE pins ADD COLUMN location_type TEXT DEFAULT 'city';

-- Drop old unique constraint
ALTER TABLE pins DROP CONSTRAINT IF EXISTS unique_user_location;

-- Add new unique constraint that accounts for parent
CREATE UNIQUE INDEX unique_user_location_parent ON pins (user_id, location_name, COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'));

-- location_type values:
-- 'continent' - e.g., Europe
-- 'country' - e.g., Italy
-- 'city' - e.g., Rome
-- 'sight' - e.g., Colosseum (nested under Rome)
-- 'restaurant', 'cafe', 'bar', 'hotel', 'beach', 'park', etc.
