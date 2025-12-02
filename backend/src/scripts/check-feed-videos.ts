import db from '../config/db.js'

// Check videos in feed state that don't have added_to_playlist_at (these are fetched from channels)
const feedVideosWithoutPlaylistDate = db.prepare(`
  SELECT v.id, v.youtube_id, v.title, v.created_at, v.added_to_playlist_at, vs.state, vs.updated_at as state_updated_at
  FROM videos v
  LEFT JOIN video_states vs ON v.id = vs.video_id
  WHERE vs.state = 'feed' 
    AND v.added_to_playlist_at IS NULL
  ORDER BY v.created_at DESC
  LIMIT 20
`).all() as Array<{
  id: number
  youtube_id: string
  title: string
  created_at: string | null
  added_to_playlist_at: string | null
  state: string
  state_updated_at: string | null
}>

console.log(`Found ${feedVideosWithoutPlaylistDate.length} videos in feed state without added_to_playlist_at (fetched from channels):`)
feedVideosWithoutPlaylistDate.forEach(v => {
  console.log(`  ID: ${v.id}, Created: ${v.created_at || 'NULL'}, State updated: ${v.state_updated_at || 'NULL'}, Title: ${v.title.substring(0, 60)}...`)
})

// Count total
const totalCount = db.prepare(`
  SELECT COUNT(*) as count
  FROM videos v
  LEFT JOIN video_states vs ON v.id = vs.video_id
  WHERE vs.state = 'feed' 
    AND v.added_to_playlist_at IS NULL
`).get() as { count: number }

console.log(`\nTotal videos in feed state without added_to_playlist_at: ${totalCount.count}`)

// Check if any have NULL created_at
const nullCreatedAt = feedVideosWithoutPlaylistDate.filter(v => !v.created_at)
console.log(`\nVideos with NULL created_at: ${nullCreatedAt.length}`)

