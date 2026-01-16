-- Migration: Create unified_media database view
-- This view provides a unified interface for querying across videos, movies, and TV shows

CREATE VIEW IF NOT EXISTS unified_media AS
SELECT 
  'video' as media_type,
  id,
  title,
  created_at,
  added_to_playlist_at as added_at,
  youtube_url as url,
  thumbnail_url as image_url,
  duration,
  NULL as release_date
FROM videos
UNION ALL
SELECT 
  'movie' as media_type,
  id,
  title,
  created_at,
  saved_at as added_at,
  NULL as url,
  poster_path as image_url,
  NULL as duration,
  release_date
FROM movies
UNION ALL
SELECT 
  'tv_show' as media_type,
  id,
  title,
  created_at,
  saved_at as added_at,
  NULL as url,
  poster_path as image_url,
  NULL as duration,
  first_air_date as release_date
FROM tv_shows;
