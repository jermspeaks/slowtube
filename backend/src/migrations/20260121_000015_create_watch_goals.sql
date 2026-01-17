-- Migration: Create watch_goals table
-- This table allows setting and tracking viewing goals

CREATE TABLE IF NOT EXISTS watch_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  target_type TEXT NOT NULL CHECK(target_type IN ('videos', 'movies', 'tv_shows', 'episodes', 'hours')),
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  start_date DATE,
  end_date DATE,
  completed BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_watch_goals_completed ON watch_goals(completed);
CREATE INDEX IF NOT EXISTS idx_watch_goals_dates ON watch_goals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_watch_goals_target_type ON watch_goals(target_type);
