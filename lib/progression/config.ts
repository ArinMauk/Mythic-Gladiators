export interface ArenaReward {
  xp: number
  gold: number
}

export type LevelId = "level-1" | "level-2"

export const ARENA_REWARDS: Record<LevelId, ArenaReward> = {
  "level-1": {
    xp: 120,
    gold: 50,
  },
  "level-2": {
    xp: 250,
    gold: 120,
  },
}

export const PROGRESSION_CONFIG = {
  initialLevel: 1,
  maxLevel: 10,
  talentPointsPerLevel: 1,
  // XP required to advance from (level) to (level + 1)
  xpThresholds: {
    1: 100,
    2: 150,
    3: 220,
    4: 310,
    5: 420,
    6: 550,
    7: 700,
    8: 880,
    9: 1100,
  } as Record<number, number>,
}

export function getXpRequiredForNextLevel(currentLevel: number): number {
  if (currentLevel >= PROGRESSION_CONFIG.maxLevel) {
    return 0
  }
  return PROGRESSION_CONFIG.xpThresholds[currentLevel] ?? 1000
}

export function isMaxLevel(level: number): boolean {
  return level >= PROGRESSION_CONFIG.maxLevel
}
