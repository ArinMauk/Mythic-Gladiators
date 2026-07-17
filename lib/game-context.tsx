"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type CompanionType = "ai" | "players"
type GameMode = "pvp" | "pve"
type GameClass = "warrior" | "priest" | "hunter" | "rogue" | "mage" | "warlock" | "paladin" | "shaman"
export type LevelId = "level-1" | "level-2"

interface GameState {
  username: string
  companionType: CompanionType | null
  gameMode: GameMode | null
  selectedClass: GameClass | null
  selectedLevel: LevelId
  selectedTalents: string[]
  setUsername: (name: string) => void
  setCompanionType: (type: CompanionType) => void
  setGameMode: (mode: GameMode) => void
  setSelectedClass: (cls: GameClass) => void
  setSelectedLevel: (level: LevelId) => void
  setSelectedTalents: (talents: string[]) => void
}

const GameContext = createContext<GameState | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("")
  const [companionType, setCompanionType] = useState<CompanionType | null>(null)
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [selectedClass, setSelectedClass] = useState<GameClass | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LevelId>("level-1")
  const [selectedTalents, setSelectedTalents] = useState<string[]>([])

  return (
    <GameContext.Provider
      value={{
        username,
        companionType,
        gameMode,
        selectedClass,
        selectedLevel,
        selectedTalents,
        setUsername,
        setCompanionType,
        setGameMode,
        setSelectedClass,
        setSelectedLevel,
        setSelectedTalents,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error("useGame must be used within a GameProvider")
  }
  return context
}
