-- Add country and continent columns to pins table
ALTER TABLE pins ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE pins ADD COLUMN IF NOT EXISTS continent TEXT;

-- Update existing pins based on location_name
-- Rio de Janeiro -> Brazil -> South America
UPDATE pins SET country = 'Brazil', continent = 'South America'
WHERE location_name ILIKE '%rio de janeiro%' AND country IS NULL;

-- Italy pins
UPDATE pins SET country = 'Italy', continent = 'Europe'
WHERE location_name ILIKE '%italy%' AND country IS NULL;
