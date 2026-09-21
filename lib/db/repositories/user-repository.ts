import crypto from "crypto"
import { Database } from "better-sqlite3"
import { getDb } from "../db"
import { UserModel } from "@/lib/progression/types"

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return `${salt}:${hash}`
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, originalHash] = storedHash.split(":")
  if (!salt || !originalHash) return false
  const hash = crypto.scryptSync(password, salt, 64).toString("hex")
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash))
}

export class UserRepository {
  private customDb?: Database

  constructor(db?: Database) {
    this.customDb = db
  }

  private get db(): Database {
    return this.customDb || getDb()
  }

  createUser(username: string, email: string, password: string): UserModel {
    const trimmedUsername = username.trim()
    const trimmedEmail = email.trim().toLowerCase()
    const passwordHash = hashPassword(password)
    const id = crypto.randomUUID()
    const now = Date.now()

    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, email, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    stmt.run(id, trimmedUsername, trimmedEmail, passwordHash, now, now)

    return {
      id,
      username: trimmedUsername,
      email: trimmedEmail,
      createdAt: now,
    }
  }

  authenticateUser(usernameOrEmail: string, password: string): UserModel | null {
    const term = usernameOrEmail.trim().toLowerCase()
    const stmt = this.db.prepare(`
      SELECT id, username, email, password_hash, created_at
      FROM users
      WHERE LOWER(username) = ? OR LOWER(email) = ?
      LIMIT 1
    `)

    const row = stmt.get(term, term) as
      | {
          id: string
          username: string
          email: string
          password_hash: string
          created_at: number
        }
      | undefined

    if (!row) return null

    const isValid = verifyPassword(password, row.password_hash)
    if (!isValid) return null

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: row.created_at,
    }
  }

  getUserById(id: string): UserModel | null {
    const stmt = this.db.prepare(`
      SELECT id, username, email, created_at
      FROM users
      WHERE id = ?
      LIMIT 1
    `)

    const row = stmt.get(id) as
      | {
          id: string
          username: string
          email: string
          created_at: number
        }
      | undefined

    if (!row) return null

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      createdAt: row.created_at,
    }
  }

  createSession(userId: string, ttlMs = 1000 * 60 * 60 * 24 * 7): string {
    const sessionId = crypto.randomUUID()
    const now = Date.now()
    const expiresAt = now + ttlMs

    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, user_id, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `)

    stmt.run(sessionId, userId, expiresAt, now)
    return sessionId
  }

  getSession(sessionId: string): { userId: string } | null {
    const stmt = this.db.prepare(`
      SELECT user_id, expires_at
      FROM sessions
      WHERE id = ?
      LIMIT 1
    `)

    const row = stmt.get(sessionId) as
      | { user_id: string; expires_at: number }
      | undefined

    if (!row) return null

    if (row.expires_at < Date.now()) {
      this.deleteSession(sessionId)
      return null
    }

    return { userId: row.user_id }
  }

  deleteSession(sessionId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM sessions WHERE id = ?
    `)
    stmt.run(sessionId)
  }
}
