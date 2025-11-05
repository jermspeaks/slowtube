import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get database path from environment or use default
const dbDir = process.env.DATABASE_PATH 
  ? path.dirname(process.env.DATABASE_PATH)
  : path.join(__dirname, '../../database')

const dbPath = process.env.DATABASE_PATH 
  ? process.env.DATABASE_PATH
  : path.join(dbDir, 'watch-later.db')

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

// Initialize database connection
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize schema
function initializeSchema() {
  try {
    const schemaPath = path.join(__dirname, '../models/schema.sql')
    const schema = readFileSync(schemaPath, 'utf-8')
    
    // Execute schema statements (CREATE TABLE IF NOT EXISTS will skip if tables exist)
    db.exec(schema)
    console.log('Database schema initialized')
  } catch (error) {
    console.error('Schema initialization error:', error)
    // Don't throw - schema might already be initialized or tables might already exist
    // This is fine because migrations handle existing tables
  }
}


// Run migrations for existing databases (must run before schema initialization)
function runMigrations() {
  try {
    // Check if videos table exists
    const tableExists = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='videos'
    `).get()
    
    if (tableExists) {
      // Table exists, check if new columns exist
      const tableInfo = db.prepare("PRAGMA table_info(videos)").all() as Array<{ name: string }>
      const columnNames = tableInfo.map(col => col.name)
      
      // Add new columns if they don't exist
      if (!columnNames.includes('added_to_playlist_at')) {
        db.exec('ALTER TABLE videos ADD COLUMN added_to_playlist_at TEXT')
        console.log('Added column: added_to_playlist_at')
      }
      
      if (!columnNames.includes('fetch_status')) {
        db.exec("ALTER TABLE videos ADD COLUMN fetch_status TEXT DEFAULT 'pending'")
        console.log('Added column: fetch_status')
      }
      
      if (!columnNames.includes('channel_title')) {
        db.exec('ALTER TABLE videos ADD COLUMN channel_title TEXT')
        console.log('Added column: channel_title')
      }
      
      if (!columnNames.includes('youtube_url')) {
        db.exec('ALTER TABLE videos ADD COLUMN youtube_url TEXT')
        console.log('Added column: youtube_url')
      }
      
      // Check if index exists
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_videos_fetch_status'").get()
      if (!indexes) {
        db.exec('CREATE INDEX IF NOT EXISTS idx_videos_fetch_status ON videos(fetch_status)')
        console.log('Added index: idx_videos_fetch_status')
      }
    }
  } catch (error) {
    console.error('Migration error:', error)
    throw error
  }
}

// Initialize on first load - run migrations first, then schema
runMigrations()
initializeSchema()

export default db

