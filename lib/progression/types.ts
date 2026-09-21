import { LevelId } from "./config"

export type GameClass =
  | "warrior"
  | "priest"
  | "hunter"
  | "rogue"
  | "mage"
  | "warlock"
  | "paladin"
  | "shaman"

export interface CharacterModel {
  id: string
  userId: string
  name: string
  class: GameClass
  level: number
  xp: number
  gold: number
  unspentTalentPoints: number
  selectedTalents: string[]
  inventory: any[]
  equipment: Record<string, any>
  cosmetics: Record<string, any>
  createdAt: number
  updatedAt: number
}

export interface LevelUpEvent {
  newLevel: number
  talentPointsAwarded: number
}

export interface ProgressionCalculationResult {
  previousLevel: number
  previousXp: number
  previousGold: number
  newLevel: number
  newXp: number
  newGold: number
  xpEarned: number
  goldEarned: number
  levelsGained: number
  talentPointsEarned: number
  newUnspentTalentPoints: number
  xpForNextLevel: number
  xpProgressPercentage: number
  isMaxLevel: boolean
  levelUpEvents: LevelUpEvent[]
}

export interface MatchCompletionRequest {
  matchId: string
  characterId: string
  arenaId: LevelId
  outcome: "victory" | "defeat"
}

export interface ProgressionRewardResult {
  matchId: string
  characterId: string
  arenaId: LevelId
  outcome: "victory" | "defeat"
  xpEarned: number
  goldEarned: number
  previousLevel: number
  newLevel: number
  levelsGained: number
  talentPointsEarned: number
  currentXp: number
  xpForNextLevel: number
  xpProgressPercentage: number
  totalGold: number
  unspentTalentPoints: number
  isMaxLevel: boolean
  alreadyClaimed?: boolean
}

export interface UserModel {
  id: string
  username: string
  email: string
  createdAt: number
}
