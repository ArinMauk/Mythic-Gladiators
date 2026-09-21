import {
  ARENA_REWARDS,
  LevelId,
  PROGRESSION_CONFIG,
  getXpRequiredForNextLevel,
  isMaxLevel,
} from "./config"
import { LevelUpEvent, ProgressionCalculationResult } from "./types"

export interface CalculateProgressionParams {
  currentLevel: number
  currentXp: number
  currentGold: number
  currentUnspentTalentPoints: number
  arenaId: LevelId
  outcome: "victory" | "defeat"
  bonusXp?: number
  bonusGold?: number
}

export class ProgressionService {
  /**
   * Pure domain calculation for applying arena match outcome and rewards.
   */
  static calculateMatchProgression(
    params: CalculateProgressionParams
  ): ProgressionCalculationResult {
    const {
      currentLevel,
      currentXp,
      currentGold,
      currentUnspentTalentPoints,
      arenaId,
      outcome,
      bonusXp = 0,
      bonusGold = 0,
    } = params

    // Only victories award progression rewards
    let xpEarned = 0
    let goldEarned = 0

    if (outcome === "victory") {
      const arenaReward = ARENA_REWARDS[arenaId] ?? { xp: 100, gold: 50 }
      xpEarned = arenaReward.xp + Math.max(0, bonusXp)
      goldEarned = arenaReward.gold + Math.max(0, bonusGold)
    }

    const {
      newLevel,
      newXp,
      levelsGained,
      talentPointsEarned,
      levelUpEvents,
    } = this.calculateXpAddition({
      currentLevel,
      currentXp,
      xpToAdd: xpEarned,
    })

    const newGold = currentGold + goldEarned
    const newUnspentTalentPoints = currentUnspentTalentPoints + talentPointsEarned
    const maxed = isMaxLevel(newLevel)
    const xpForNextLevel = getXpRequiredForNextLevel(newLevel)
    const xpProgressPercentage = maxed
      ? 100
      : xpForNextLevel > 0
      ? Math.min(100, Math.floor((newXp / xpForNextLevel) * 100))
      : 100

    return {
      previousLevel: currentLevel,
      previousXp: currentXp,
      previousGold: currentGold,
      newLevel,
      newXp,
      newGold,
      xpEarned,
      goldEarned,
      levelsGained,
      talentPointsEarned,
      newUnspentTalentPoints,
      xpForNextLevel,
      xpProgressPercentage,
      isMaxLevel: maxed,
      levelUpEvents,
    }
  }

  /**
   * Applies XP gain, resolving single or multiple level-ups and excess XP.
   */
  static calculateXpAddition({
    currentLevel,
    currentXp,
    xpToAdd,
  }: {
    currentLevel: number
    currentXp: number
    xpToAdd: number
  }): {
    newLevel: number
    newXp: number
    levelsGained: number
    talentPointsEarned: number
    levelUpEvents: LevelUpEvent[]
  } {
    let level = Math.max(PROGRESSION_CONFIG.initialLevel, currentLevel)
    let xp = Math.max(0, currentXp) + Math.max(0, xpToAdd)
    let levelsGained = 0
    let talentPointsEarned = 0
    const levelUpEvents: LevelUpEvent[] = []

    // If already at or above cap, cannot level up
    if (isMaxLevel(level)) {
      return {
        newLevel: PROGRESSION_CONFIG.maxLevel,
        newXp: xp,
        levelsGained: 0,
        talentPointsEarned: 0,
        levelUpEvents: [],
      }
    }

    // Process potential level-ups (can cross multiple thresholds)
    while (!isMaxLevel(level)) {
      const requiredXp = getXpRequiredForNextLevel(level)
      if (xp >= requiredXp) {
        xp -= requiredXp
        level += 1
        levelsGained += 1
        const talentAward = PROGRESSION_CONFIG.talentPointsPerLevel
        talentPointsEarned += talentAward
        levelUpEvents.push({
          newLevel: level,
          talentPointsAwarded: talentAward,
        })
      } else {
        break
      }
    }

    // If max level was reached in this batch, retain remaining excess XP
    if (isMaxLevel(level)) {
      level = PROGRESSION_CONFIG.maxLevel
    }

    return {
      newLevel: level,
      newXp: xp,
      levelsGained,
      talentPointsEarned,
      levelUpEvents,
    }
  }
}
