-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TEXT,
  added_to_playlist_at TEXT,
  fetch_status TEXT CHECK(fetch_status IN ('pending', 'completed', 'unavailable', 'failed')) DEFAULT 'pending',
  channel_title TEXT,
  youtube_channel_id TEXT,
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
  user_id TEXT NOT NULL,
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

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX IF NOT EXISTS idx_videos_fetch_status ON videos(fetch_status);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_channel_id ON videos(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_tags_video_id ON tags(video_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_states_state ON video_states(state);
CREATE INDEX IF NOT EXISTS idx_oauth_sessions_user_id ON oauth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_youtube_channel_id ON channels(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_channels_is_subscribed ON channels(is_subscribed);

