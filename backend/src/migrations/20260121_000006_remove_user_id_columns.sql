-- Migration: Remove user_id columns from oauth_sessions and user_player_preferences
-- This migration removes user context since the app is single-user

-- Step 1: Remove user_id from oauth_sessions
-- SQLite doesn't support DROP COLUMN, so we need to recreate the table
CREATE TABLE IF NOT EXISTS oauth_sessions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO oauth_sessions_new (id, access_token, refresh_token, expires_at, created_at, updated_at)
SELECT id, access_token, refresh_token, expires_at, created_at, updated_at
FROM oauth_sessions;

DROP TABLE oauth_sessions;
ALTER TABLE oauth_sessions_new RENAME TO oauth_sessions;

-- Recreate index
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_created_at ON oauth_sessions(created_at);

-- Step 2: Remove user_id from user_player_preferences
-- Since there's only one user, we can simplify this to a single row
CREATE TABLE IF NOT EXISTS user_player_preferences_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  default_playback_speed REAL DEFAULT 1.0,
  default_volume REAL DEFAULT 1.0,
  autoplay_enabled BOOLEAN DEFAULT 1,
  keyboard_shortcuts_enabled BOOLEAN DEFAULT 1,
  light_mode_enabled BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Migrate data (take the first/latest user's preferences)
INSERT INTO user_player_preferences_new (
  default_playback_speed, default_volume, autoplay_enabled,
  keyboard_shortcuts_enabled, light_mode_enabled, updated_at
)
SELECT 
  default_playback_speed, default_volume, autoplay_enabled,
  keyboard_shortcuts_enabled, light_mode_enabled, updated_at
FROM user_player_preferences
ORDER BY updated_at DESC
LIMIT 1;

DROP TABLE user_player_preferences;
ALTER TABLE user_player_preferences_new RENAME TO user_player_preferences;
