import { Database } from "better-sqlite3"
import { getDb } from "../db"

export interface MatchRecord {
  id: string
  characterId: string
  arenaId: string
  outcome: "victory" | "defeat"
  xpAwarded: number
  goldAwarded: number
  completedAt: number
}

interface RawMatchRow {
  id: string
  character_id: string
  arena_id: string
  outcome: string
  xp_awarded: number
  gold_awarded: number
  completed_at: number
}

function mapRowToMatch(row: RawMatchRow): MatchRecord {
  return {
    id: row.id,
    characterId: row.character_id,
    arenaId: row.arena_id,
    outcome: row.outcome as "victory" | "defeat",
    xpAwarded: row.xp_awarded,
    goldAwarded: row.gold_awarded,
    completedAt: row.completed_at,
  }
}

export class MatchRepository {
  private customDb?: Database

  constructor(db?: Database) {
    this.customDb = db
  }

  private get db(): Database {
    return this.customDb || getDb()
  }

  getMatchRecord(matchId: string): MatchRecord | null {
    const stmt = this.db.prepare(`
      SELECT * FROM match_records WHERE id = ? LIMIT 1
    `)
    const row = stmt.get(matchId) as RawMatchRow | undefined
    return row ? mapRowToMatch(row) : null
  }

  recordMatch(record: MatchRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO match_records (
        id, character_id, arena_id, outcome, xp_awarded, gold_awarded, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      record.id,
      record.characterId,
      record.arenaId,
      record.outcome,
      record.xpAwarded,
      record.goldAwarded,
      record.completedAt
    )
  }
}
