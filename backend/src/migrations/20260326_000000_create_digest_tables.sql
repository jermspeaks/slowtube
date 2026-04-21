-- Digest Channels: channels the user wants to track for daily digest
CREATE TABLE IF NOT EXISTS digest_channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_channel_id TEXT NOT NULL UNIQUE,
  channel_title TEXT,
  thumbnail_url TEXT,
  added_from TEXT, -- 'subscribed' | 'watch_later' | 'liked' | 'manual'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Digest Items: ephemeral cache of videos fetched from digest channels
-- Videos are pruned after 14 days unless added to Watch Later
CREATE TABLE IF NOT EXISTS digest_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  youtube_video_id TEXT NOT NULL UNIQUE,
  youtube_channel_id TEXT NOT NULL,
  channel_title TEXT,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration TEXT,
  published_at TEXT,
  fetched_at TEXT DEFAULT (datetime('now')),
  is_dismissed INTEGER DEFAULT 0,
  FOREIGN KEY (youtube_channel_id) REFERENCES digest_channels(youtube_channel_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_digest_items_channel ON digest_items(youtube_channel_id);
CREATE INDEX IF NOT EXISTS idx_digest_items_published ON digest_items(published_at);
CREATE INDEX IF NOT EXISTS idx_digest_items_dismissed ON digest_items(is_dismissed);
