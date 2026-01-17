-- Video progress table
CREATE TABLE IF NOT EXISTS video_progress (
  video_id INTEGER NOT NULL PRIMARY KEY,
  progress_seconds REAL NOT NULL DEFAULT 0,
  last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Video player settings table
CREATE TABLE IF NOT EXISTS video_player_settings (
  video_id INTEGER NOT NULL PRIMARY KEY,
  start_time_seconds REAL DEFAULT NULL,
  end_time_seconds REAL DEFAULT NULL,
  playback_speed REAL DEFAULT 1.0,
  volume REAL DEFAULT 1.0,
  autoplay_next BOOLEAN DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- User player preferences table
CREATE TABLE IF NOT EXISTS user_player_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  default_playback_speed REAL DEFAULT 1.0,
  default_volume REAL DEFAULT 1.0,
  autoplay_enabled BOOLEAN DEFAULT 1,
  keyboard_shortcuts_enabled BOOLEAN DEFAULT 1,
  light_mode_enabled BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_last_watched_at ON video_progress(last_watched_at);
CREATE INDEX IF NOT EXISTS idx_video_player_settings_video_id ON video_player_settings(video_id);
CREATE INDEX IF NOT EXISTS idx_user_player_preferences_user_id ON user_player_preferences(user_id);
