-- Migration: Normalize episode air dates to 20:00 UTC
-- This migration updates all episode air_date values that are date-only (YYYY-MM-DD)
-- or have midnight UTC (00:00:00Z) to include time component at 20:00 UTC (YYYY-MM-DDTHH:00:00Z)
-- This ensures episodes appear on the correct day when converted to different timezones

-- Update episodes where air_date is date-only (10 characters: YYYY-MM-DD)
-- and doesn't already contain a time component
UPDATE episodes
SET air_date = air_date || 'T20:00:00Z'
WHERE air_date IS NOT NULL
  AND LENGTH(air_date) = 10
  AND air_date NOT LIKE '%T%';

-- Update episodes where air_date has midnight UTC (T00:00:00Z or T00:00:00.000Z)
-- Replace with 20:00:00Z
UPDATE episodes
SET air_date = SUBSTR(air_date, 1, 10) || 'T20:00:00Z'
WHERE air_date IS NOT NULL
  AND (air_date LIKE '%T00:00:00Z' OR air_date LIKE '%T00:00:00.000Z');

