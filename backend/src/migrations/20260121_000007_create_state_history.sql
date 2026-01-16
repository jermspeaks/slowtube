-- Migration: Create state_history table
-- This table tracks all state changes for audit and analytics purposes

CREATE TABLE IF NOT EXISTS state_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  media_type TEXT NOT NULL CHECK(media_type IN ('video', 'movie', 'tv_show', 'episode')),
  media_id INTEGER NOT NULL,
  old_state TEXT,
  new_state TEXT,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_state_history_media ON state_history(media_type, media_id);
CREATE INDEX IF NOT EXISTS idx_state_history_changed_at ON state_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_state_history_new_state ON state_history(new_state);
