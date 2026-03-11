-- Create pins table
CREATE TABLE pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  location_name TEXT NOT NULL,
  latitude FLOAT NOT NULL,
  longitude FLOAT NOT NULL,
  source_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create index for faster user queries
CREATE INDEX pins_user_id_idx ON pins(user_id);

-- Enable Row Level Security
ALTER TABLE pins ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pins
CREATE POLICY "Users can view own pins"
  ON pins
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own pins
CREATE POLICY "Users can insert own pins"
  ON pins
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pins
CREATE POLICY "Users can update own pins"
  ON pins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own pins
CREATE POLICY "Users can delete own pins"
  ON pins
  FOR DELETE
  USING (auth.uid() = user_id);
