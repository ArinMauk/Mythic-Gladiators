import { Database } from "better-sqlite3"
import { getDb } from "@/lib/db/db"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"
import { MatchRepository } from "@/lib/db/repositories/match-repository"
import { ProgressionService } from "./progression-service"
import { MatchCompletionRequest, ProgressionRewardResult } from "./types"
import { getXpRequiredForNextLevel, isMaxLevel } from "./config"

export class MatchProgressionHandler {
  private customDb?: Database
  private _charRepo?: CharacterRepository
  private _matchRepo?: MatchRepository

  constructor(db?: Database) {
    this.customDb = db
  }

  private get db(): Database {
    return this.customDb || getDb()
  }

  private get charRepo(): CharacterRepository {
    if (!this._charRepo) {
      this._charRepo = new CharacterRepository(this.db)
    }
    return this._charRepo
  }

  private get matchRepo(): MatchRepository {
    if (!this._matchRepo) {
      this._matchRepo = new MatchRepository(this.db)
    }
    return this._matchRepo
  }

  handleMatchCompletion(
    request: MatchCompletionRequest,
    authenticatedUserId?: string
  ): ProgressionRewardResult {
    const { matchId, characterId, arenaId, outcome } = request

    // 1. Fetch character
    const character = this.charRepo.getCharacterById(characterId)
    if (!character) {
      throw new Error(`Character not found: ${characterId}`)
    }

    if (authenticatedUserId && character.userId !== authenticatedUserId) {
      throw new Error(`Unauthorized: Character does not belong to user`)
    }

    // 2. Check for duplicate match submission (idempotency guard)
    const existingMatch = this.matchRepo.getMatchRecord(matchId)
    if (existingMatch) {
      const maxed = isMaxLevel(character.level)
      const xpForNextLevel = getXpRequiredForNextLevel(character.level)
      const xpProgressPercentage = maxed
        ? 100
        : xpForNextLevel > 0
        ? Math.min(100, Math.floor((character.xp / xpForNextLevel) * 100))
        : 100

      return {
        matchId,
        characterId,
        arenaId,
        outcome,
        xpEarned: existingMatch.xpAwarded,
        goldEarned: existingMatch.goldAwarded,
        previousLevel: character.level,
        newLevel: character.level,
        levelsGained: 0,
        talentPointsEarned: 0,
        currentXp: character.xp,
        xpForNextLevel,
        xpProgressPercentage,
        totalGold: character.gold,
        unspentTalentPoints: character.unspentTalentPoints,
        isMaxLevel: maxed,
        alreadyClaimed: true,
      }
    }

    // 3. Calculate progression rewards
    const calc = ProgressionService.calculateMatchProgression({
      currentLevel: character.level,
      currentXp: character.xp,
      currentGold: character.gold,
      currentUnspentTalentPoints: character.unspentTalentPoints,
      arenaId,
      outcome,
    })

    // 4. Atomically persist character updates and match record
    const runTransaction = this.db.transaction(() => {
      this.charRepo.updateProgression({
        id: character.id,
        level: calc.newLevel,
        xp: calc.newXp,
        gold: calc.newGold,
        unspentTalentPoints: calc.newUnspentTalentPoints,
      })

      this.matchRepo.recordMatch({
        id: matchId,
        characterId: character.id,
        arenaId,
        outcome,
        xpAwarded: calc.xpEarned,
        goldAwarded: calc.goldEarned,
        completedAt: Date.now(),
      })
    })

    runTransaction()

    return {
      matchId,
      characterId,
      arenaId,
      outcome,
      xpEarned: calc.xpEarned,
      goldEarned: calc.goldEarned,
      previousLevel: calc.previousLevel,
      newLevel: calc.newLevel,
      levelsGained: calc.levelsGained,
      talentPointsEarned: calc.talentPointsEarned,
      currentXp: calc.newXp,
      xpForNextLevel: calc.xpForNextLevel,
      xpProgressPercentage: calc.xpProgressPercentage,
      totalGold: calc.newGold,
      unspentTalentPoints: calc.newUnspentTalentPoints,
      isMaxLevel: calc.isMaxLevel,
      alreadyClaimed: false,
    }
  }
}
