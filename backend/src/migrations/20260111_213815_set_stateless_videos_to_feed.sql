-- Migration: Set all stateless videos to 'feed' state
-- This migration sets the state to 'feed' for all videos that don't have a state set
-- These are videos that were fetched via the latest endpoint but didn't get their state set

-- Insert 'feed' state for all videos that don't have a state
INSERT INTO video_states (video_id, state, updated_at)
SELECT id, 'feed', CURRENT_TIMESTAMP
FROM videos
WHERE id NOT IN (SELECT video_id FROM video_states);
