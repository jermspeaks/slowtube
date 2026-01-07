-- Migration: Add is_started and started_at columns to tv_show_states table
-- This migration adds fields to track whether a TV show has been started watching

-- Add is_started column to tv_show_states table
ALTER TABLE tv_show_states ADD COLUMN is_started INTEGER DEFAULT 0 CHECK(is_started IN (0, 1));

-- Add started_at column to track when the show was marked as started
ALTER TABLE tv_show_states ADD COLUMN started_at DATETIME;

-- Add index on is_started for filtering performance
CREATE INDEX IF NOT EXISTS idx_tv_show_states_is_started ON tv_show_states(is_started);

