-- Migration: Backfill added_to_playlist_at for feed videos
-- This migration sets added_to_playlist_at to video_states.updated_at for videos in feed state
-- that don't have added_to_playlist_at set (videos fetched from channels)

-- Update videos that are in 'feed' state and have NULL added_to_playlist_at
-- Set added_to_playlist_at to the updated_at timestamp from video_states
UPDATE videos
SET added_to_playlist_at = (
  SELECT vs.updated_at 
  FROM video_states vs 
  WHERE vs.video_id = videos.id AND vs.state = 'feed'
)
WHERE added_to_playlist_at IS NULL
  AND EXISTS (
    SELECT 1 FROM video_states vs 
    WHERE vs.video_id = videos.id AND vs.state = 'feed'
  );

