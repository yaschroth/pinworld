-- ============================================
-- Migration: Upgrade Collections to Trips
-- ============================================

-- Step 1: Rename collections table to trips
ALTER TABLE collections RENAME TO trips;

-- Step 2: Add date fields to trips
ALTER TABLE trips ADD COLUMN start_date DATE;
ALTER TABLE trips ADD COLUMN end_date DATE;

-- Step 3: Create new trip_pins junction table with day support
CREATE TABLE trip_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE NOT NULL,
  pin_id UUID REFERENCES pins(id) ON DELETE CASCADE NOT NULL,
  day_number INTEGER, -- NULL = unassigned, 1 = Day 1, etc.
  order_in_day INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(trip_id, pin_id)
);

-- Step 4: Create indexes for performance
CREATE INDEX trip_pins_trip_id_idx ON trip_pins(trip_id);
CREATE INDEX trip_pins_pin_id_idx ON trip_pins(pin_id);
CREATE INDEX trip_pins_day_idx ON trip_pins(trip_id, day_number);

-- Step 5: Enable RLS on trip_pins
ALTER TABLE trip_pins ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS policies for trip_pins
CREATE POLICY "Users can view pins in own trips"
  ON trip_pins FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM trips WHERE trips.id = trip_pins.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pins to own trips"
  ON trip_pins FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM trips WHERE trips.id = trip_pins.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can update pins in own trips"
  ON trip_pins FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM trips WHERE trips.id = trip_pins.trip_id AND trips.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete pins from own trips"
  ON trip_pins FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM trips WHERE trips.id = trip_pins.trip_id AND trips.user_id = auth.uid()
  ));

-- Step 7: Migrate data from pin_collections to trip_pins
INSERT INTO trip_pins (trip_id, pin_id, day_number, order_in_day)
SELECT collection_id, pin_id, NULL, 0
FROM pin_collections
ON CONFLICT (trip_id, pin_id) DO NOTHING;

-- Step 8: Update RLS policies on trips table (renamed from collections)
-- Drop old policies with old names
DROP POLICY IF EXISTS "Users can view own collections" ON trips;
DROP POLICY IF EXISTS "Users can insert own collections" ON trips;
DROP POLICY IF EXISTS "Users can update own collections" ON trips;
DROP POLICY IF EXISTS "Users can delete own collections" ON trips;

-- Create new policies with updated names
CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  USING (auth.uid() = user_id);

-- Note: Keep pin_collections table for now as backup
-- Can drop later with: DROP TABLE pin_collections;
