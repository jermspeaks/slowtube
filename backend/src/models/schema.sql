-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TEXT,
  added_to_playlist_at DATETIME,
  added_to_latest_at DATETIME,
  fetch_status TEXT CHECK(fetch_status IN ('pending', 'completed', 'unavailable', 'failed')) DEFAULT 'pending',
  youtube_channel_id TEXT,
  channel_id INTEGER,
  youtube_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
  UNIQUE(video_id, name)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  video_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- Video states table
CREATE TABLE IF NOT EXISTS video_states (
  video_id INTEGER NOT NULL PRIMARY KEY,
  state TEXT NOT NULL CHECK(state IN ('feed', 'inbox', 'archive')),
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
);

-- OAuth sessions table
CREATE TABLE IF NOT EXISTS oauth_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Channels table
CREATE TABLE IF NOT EXISTS channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_channel_id TEXT NOT NULL UNIQUE,
  channel_title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  subscriber_count INTEGER,
  is_subscribed INTEGER DEFAULT 0 CHECK(is_subscribed IN (0, 1)),
  custom_tags TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

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
  default_playback_speed REAL DEFAULT 1.0,
  default_volume REAL DEFAULT 1.0,
  autoplay_enabled BOOLEAN DEFAULT 1,
  keyboard_shortcuts_enabled BOOLEAN DEFAULT 1,
  light_mode_enabled BOOLEAN DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_fetch_status ON videos(fetch_status);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_channel_id ON videos(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_tags_video_id ON tags(video_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_states_state ON video_states(state);
CREATE INDEX IF NOT EXISTS idx_channels_youtube_channel_id ON channels(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_subscribed ON channels(is_subscribed);
CREATE INDEX IF NOT EXISTS idx_video_progress_video_id ON video_progress(video_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_last_watched_at ON video_progress(last_watched_at);
CREATE INDEX IF NOT EXISTS idx_video_player_settings_video_id ON video_player_settings(video_id);

