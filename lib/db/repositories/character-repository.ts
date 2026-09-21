import crypto from "crypto"
import { Database } from "better-sqlite3"
import { getDb } from "../db"
import { CharacterModel, GameClass } from "@/lib/progression/types"
import { PROGRESSION_CONFIG } from "@/lib/progression/config"

interface RawCharacterRow {
  id: string
  user_id: string
  name: string
  class: string
  level: number
  xp: number
  gold: number
  unspent_talent_points: number
  selected_talents: string
  inventory: string
  equipment: string
  cosmetics: string
  created_at: number
  updated_at: number
}

function mapRowToCharacter(row: RawCharacterRow): CharacterModel {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    class: row.class as GameClass,
    level: row.level,
    xp: row.xp,
    gold: row.gold,
    unspentTalentPoints: row.unspent_talent_points,
    selectedTalents: JSON.parse(row.selected_talents || "[]"),
    inventory: JSON.parse(row.inventory || "[]"),
    equipment: JSON.parse(row.equipment || "{}"),
    cosmetics: JSON.parse(row.cosmetics || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class CharacterRepository {
  private customDb?: Database

  constructor(db?: Database) {
    this.customDb = db
  }

  private get db(): Database {
    return this.customDb || getDb()
  }

  createCharacter(params: {
    userId: string
    name: string
    class: GameClass
  }): CharacterModel {
    const id = crypto.randomUUID()
    const now = Date.now()
    const initialTalentPoints = 0

    const stmt = this.db.prepare(`
      INSERT INTO characters (
        id, user_id, name, class, level, xp, gold,
        unspent_talent_points, selected_talents, inventory,
        equipment, cosmetics, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)

    stmt.run(
      id,
      params.userId,
      params.name.trim(),
      params.class,
      PROGRESSION_CONFIG.initialLevel,
      0, // initial xp
      0, // initial gold
      initialTalentPoints,
      JSON.stringify([]),
      JSON.stringify([]),
      JSON.stringify({}),
      JSON.stringify({}),
      now,
      now
    )

    return this.getCharacterById(id)!
  }

  getCharacterById(id: string): CharacterModel | null {
    const stmt = this.db.prepare(`
      SELECT * FROM characters WHERE id = ? LIMIT 1
    `)
    const row = stmt.get(id) as RawCharacterRow | undefined
    return row ? mapRowToCharacter(row) : null
  }

  getCharactersByUserId(userId: string): CharacterModel[] {
    const stmt = this.db.prepare(`
      SELECT * FROM characters WHERE user_id = ? ORDER BY created_at ASC
    `)
    const rows = stmt.all(userId) as RawCharacterRow[]
    return rows.map(mapRowToCharacter)
  }

  updateProgression(params: {
    id: string
    level: number
    xp: number
    gold: number
    unspentTalentPoints: number
  }): CharacterModel | null {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE characters
      SET level = ?, xp = ?, gold = ?, unspent_talent_points = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(
      params.level,
      params.xp,
      params.gold,
      params.unspentTalentPoints,
      now,
      params.id
    )

    return this.getCharacterById(params.id)
  }

  updateTalents(params: {
    id: string
    selectedTalents: string[]
    unspentTalentPoints: number
  }): CharacterModel | null {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE characters
      SET selected_talents = ?, unspent_talent_points = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(
      JSON.stringify(params.selectedTalents),
      params.unspentTalentPoints,
      now,
      params.id
    )

    return this.getCharacterById(params.id)
  }

  updateInventory(id: string, inventory: any[]): CharacterModel | null {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE characters
      SET inventory = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(JSON.stringify(inventory), now, id)
    return this.getCharacterById(id)
  }

  updateEquipment(id: string, equipment: Record<string, any>): CharacterModel | null {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE characters
      SET equipment = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(JSON.stringify(equipment), now, id)
    return this.getCharacterById(id)
  }

  updateGoldAndInventory(id: string, gold: number, inventory: any[]): CharacterModel | null {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE characters
      SET gold = ?, inventory = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(gold, JSON.stringify(inventory), now, id)
    return this.getCharacterById(id)
  }

  updateProgressionAndInventory(params: {
    id: string
    level: number
    xp: number
    gold: number
    unspentTalentPoints: number
    inventory: any[]
  }): CharacterModel | null {
    const now = Date.now()
    const stmt = this.db.prepare(`
      UPDATE characters
      SET level = ?, xp = ?, gold = ?, unspent_talent_points = ?, inventory = ?, updated_at = ?
      WHERE id = ?
    `)
    stmt.run(
      params.level,
      params.xp,
      params.gold,
      params.unspentTalentPoints,
      JSON.stringify(params.inventory),
      now,
      params.id
    )
    return this.getCharacterById(params.id)
  }

  deleteCharacter(id: string, userId: string): boolean {
    const stmt = this.db.prepare(`
      DELETE FROM characters WHERE id = ? AND user_id = ?
    `)
    const res = stmt.run(id, userId)
    return res.changes > 0
  }
}
