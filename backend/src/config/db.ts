import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { runMigrations } from './migrations.js'

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


// Initialize on first load - run migrations first, then schema
runMigrations(db, dbPath)
initializeSchema()

export default db

