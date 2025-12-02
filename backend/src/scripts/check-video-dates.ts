import db from '../config/db.js'

// Check videos that are missing created_at or have NULL values
const videosWithNullCreatedAt = db.prepare(`
  SELECT id, youtube_id, title, created_at, updated_at, added_to_playlist_at
  FROM videos
  WHERE created_at IS NULL
`).all() as Array<{
  id: number
  youtube_id: string
  title: string
  created_at: string | null
  updated_at: string
  added_to_playlist_at: string | null
}>

console.log(`Found ${videosWithNullCreatedAt.length} videos with NULL created_at`)

if (videosWithNullCreatedAt.length > 0) {
  console.log('\nVideos with NULL created_at:')
  videosWithNullCreatedAt.slice(0, 10).forEach(v => {
    console.log(`  ID: ${v.id}, Title: ${v.title.substring(0, 50)}..., Updated: ${v.updated_at}`)
  })
  if (videosWithNullCreatedAt.length > 10) {
    console.log(`  ... and ${videosWithNullCreatedAt.length - 10} more`)
  }
}

// Check videos in feed state
const feedVideos = db.prepare(`
  SELECT v.id, v.youtube_id, v.title, v.created_at, v.added_to_playlist_at, vs.state, vs.updated_at as state_updated_at
  FROM videos v
  LEFT JOIN video_states vs ON v.id = vs.video_id
  WHERE vs.state = 'feed'
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

console.log(`\nSample of ${feedVideos.length} videos in feed state:`)
feedVideos.forEach(v => {
  console.log(`  ID: ${v.id}, Created: ${v.created_at || 'NULL'}, Added to playlist: ${v.added_to_playlist_at || 'NULL'}, State updated: ${v.state_updated_at || 'NULL'}`)
})

// Backfill created_at for videos that are NULL
if (videosWithNullCreatedAt.length > 0) {
  console.log('\nBackfilling created_at for videos with NULL values...')
  const result = db.prepare(`
    UPDATE videos
    SET created_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
    WHERE created_at IS NULL
  `).run()
  console.log(`Updated ${result.changes} videos`)
}

// Verify the fix
const remainingNull = db.prepare(`
  SELECT COUNT(*) as count
  FROM videos
  WHERE created_at IS NULL
`).get() as { count: number }

console.log(`\nRemaining videos with NULL created_at: ${remainingNull.count}`)

