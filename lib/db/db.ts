import Database from "better-sqlite3"
import path from "path"
import fs from "fs"

let globalDb: Database.Database | null = null

export function initDatabase(dbPath?: string): Database.Database {
  if (globalDb && !dbPath) {
    return globalDb
  }

  const resolvedPath =
    dbPath ||
    process.env.DATABASE_PATH ||
    path.join(process.cwd(), "data", "mythic-gladiators.db")

  if (resolvedPath !== ":memory:") {
    const dir = path.dirname(resolvedPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  const db = new Database(resolvedPath, { timeout: 10000 })

  // SQLite PRAGMAs for performance and concurrency
  db.pragma("foreign_keys = ON")
  db.pragma("busy_timeout = 10000")
  if (resolvedPath !== ":memory:") {
    db.pragma("journal_mode = WAL")
  }

  // Run migrations / table creation
  migrateDatabase(db)

  if (!dbPath) {
    globalDb = db
  }

  return db
}

export function getDb(): Database.Database {
  if (!globalDb) {
    globalDb = initDatabase()
  }
  return globalDb
}

export function migrateDatabase(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL COLLATE NOCASE,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      xp INTEGER NOT NULL DEFAULT 0,
      gold INTEGER NOT NULL DEFAULT 0,
      unspent_talent_points INTEGER NOT NULL DEFAULT 0,
      selected_talents TEXT NOT NULL DEFAULT '[]',
      inventory TEXT NOT NULL DEFAULT '[]',
      equipment TEXT NOT NULL DEFAULT '{}',
      cosmetics TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_characters_user_id ON characters(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

    CREATE TABLE IF NOT EXISTS match_records (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
      arena_id TEXT NOT NULL,
      outcome TEXT NOT NULL,
      xp_awarded INTEGER NOT NULL DEFAULT 0,
      gold_awarded INTEGER NOT NULL DEFAULT 0,
      items_awarded TEXT NOT NULL DEFAULT '[]',
      completed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_match_records_character ON match_records(character_id);
  `)

  // Safe incremental migration for existing databases
  try {
    const tableInfo = db.pragma("table_info(match_records)") as Array<{ name: string }>
    const hasItemsAwarded = tableInfo.some((col) => col.name === "items_awarded")
    if (!hasItemsAwarded) {
      db.exec("ALTER TABLE match_records ADD COLUMN items_awarded TEXT NOT NULL DEFAULT '[]'")
    }
  } catch (e) {
    // Ignore if table doesn't exist yet or already migrated
  }
}
