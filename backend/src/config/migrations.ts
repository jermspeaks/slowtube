import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get migrations directory path
const migrationsDir = path.join(__dirname, '../migrations')

// Get .migrations file path (in database directory)
function getMigrationsFilePath(dbPath: string): string {
  const dbDir = path.dirname(dbPath)
  return path.join(dbDir, '.migrations')
}

// Get all migration files from migrations directory
function getMigrationFiles(): string[] {
  if (!fs.existsSync(migrationsDir)) {
    console.log('Migrations directory does not exist, creating it...')
    fs.mkdirSync(migrationsDir, { recursive: true })
    return []
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort() // Sort alphabetically (timestamp order)

  return files.map(file => path.join(migrationsDir, file))
}

// Get list of executed migrations from .migrations file
function getExecutedMigrations(dbPath: string): string[] {
  const migrationsFile = getMigrationsFilePath(dbPath)
  
  if (!fs.existsSync(migrationsFile)) {
    return []
  }

  const content = fs.readFileSync(migrationsFile, 'utf-8')
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
}

// Mark a migration as executed by appending to .migrations file
function markMigrationAsExecuted(dbPath: string, migrationFilename: string): void {
  const migrationsFile = getMigrationsFilePath(dbPath)
  
  // Ensure directory exists
  const dbDir = path.dirname(migrationsFile)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  // Append migration filename to file
  fs.appendFileSync(migrationsFile, `${migrationFilename}\n`, 'utf-8')
}

// Check if a column exists in a table
function columnExists(db: Database.Database, tableName: string, columnName: string): boolean {
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>
    return tableInfo.some(col => col.name === columnName)
  } catch (error) {
    return false
  }
}

// Check if a table exists
function tableExists(db: Database.Database, tableName: string): boolean {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name=?
    `).get(tableName)
    return !!result
  } catch (error) {
    return false
  }
}

// Check if an index exists
function indexExists(db: Database.Database, indexName: string): boolean {
  try {
    const result = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='index' AND name=?
    `).get(indexName)
    return !!result
  } catch (error) {
    return false
  }
}

// Execute migration SQL with safety checks for common operations
function executeMigrationWithSafety(db: Database.Database, migrationSQL: string): void {
  // Remove comments (lines starting with --)
  const sqlWithoutComments = migrationSQL
    .split('\n')
    .map(line => {
      const commentIndex = line.indexOf('--')
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex).trim()
      }
      return line.trim()
    })
    .filter(line => line.length > 0)
    .join('\n')

  // Check if SQL contains CREATE TRIGGER statements
  // Triggers with BEGIN...END blocks can't be safely split by semicolon
  // Since CREATE TRIGGER IF NOT EXISTS is safe, execute the full SQL
  if (sqlWithoutComments.match(/CREATE\s+TRIGGER/i)) {
    db.exec(sqlWithoutComments)
    return
  }

  // Split SQL into individual statements
  const statements = sqlWithoutComments
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)

  for (const statement of statements) {
    // Check for ALTER TABLE ADD COLUMN and skip if column already exists
    const addColumnMatch = statement.match(/ALTER\s+TABLE\s+(\w+)\s+ADD\s+COLUMN\s+(\w+)/i)
    if (addColumnMatch) {
      const [, tableName, columnName] = addColumnMatch
      if (columnExists(db, tableName, columnName)) {
        console.log(`  Column ${tableName}.${columnName} already exists, skipping...`)
        continue
      }
    }

    // Check for CREATE INDEX IF NOT EXISTS (already safe)
    if (statement.match(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS/i)) {
      // Safe to execute
      db.exec(statement)
      continue
    }

    // Check for CREATE INDEX and skip if index already exists
    const createIndexMatch = statement.match(/CREATE\s+INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)
    if (createIndexMatch) {
      const [, indexName] = createIndexMatch
      if (indexExists(db, indexName)) {
        console.log(`  Index ${indexName} already exists, skipping...`)
        continue
      }
    }

    // Execute the statement
    db.exec(statement)
  }
}

// Run all pending migrations
export function runMigrations(db: Database.Database, dbPath: string): void {
  try {
    console.log('Starting migration system...')
    
    // Get all migration files
    const migrationFiles = getMigrationFiles()
    
    if (migrationFiles.length === 0) {
      console.log('No migration files found')
      return
    }

    // Get executed migrations
    const executedMigrations = getExecutedMigrations(dbPath)
    
    // Filter to pending migrations
    const pendingMigrations = migrationFiles.filter(file => {
      const filename = path.basename(file)
      return !executedMigrations.includes(filename)
    })

    if (pendingMigrations.length === 0) {
      console.log('All migrations have been executed')
      return
    }

    console.log(`Found ${pendingMigrations.length} pending migration(s)`)

    // Execute each pending migration in order
    for (const migrationFile of pendingMigrations) {
      const filename = path.basename(migrationFile)
      console.log(`Running migration: ${filename}`)
      
      try {
        // Read migration SQL
        const migrationSQL = fs.readFileSync(migrationFile, 'utf-8')
        
        // Execute migration with safety checks
        executeMigrationWithSafety(db, migrationSQL)
        
        // Mark as executed
        markMigrationAsExecuted(dbPath, filename)
        
        console.log(`✓ Migration ${filename} executed successfully`)
      } catch (error: any) {
        console.error(`✗ Migration ${filename} failed:`, error)
        // If it's a "duplicate column" error, mark as executed anyway (idempotent)
        if (error?.code === 'SQLITE_ERROR' && error?.message?.includes('duplicate column')) {
          console.log(`  Column already exists, marking migration as executed...`)
          markMigrationAsExecuted(dbPath, filename)
        } else {
          throw error // Stop execution on other errors
        }
      }
    }

    console.log('Migration system completed successfully')
  } catch (error) {
    console.error('Migration system error:', error)
    throw error
  }
}

