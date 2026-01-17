-- Migration: Create reminders table
-- This table allows scheduling when to watch specific content

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL CHECK(media_type IN ('video', 'movie', 'tv_show', 'episode')),
  media_id INTEGER NOT NULL,
  remind_at DATETIME NOT NULL,
  reason TEXT,
  completed BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_reminders_media ON reminders(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(completed);
