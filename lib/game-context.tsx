"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type CompanionType = "ai" | "players"
type GameMode = "pvp" | "pve"
type GameClass = "warrior" | "priest" | "hunter" | "rogue" | "mage" | "warlock" | "paladin" | "shaman"

interface GameState {
  username: string
  companionType: CompanionType | null
  gameMode: GameMode | null
  selectedClass: GameClass | null
  setUsername: (name: string) => void
  setCompanionType: (type: CompanionType) => void
  setGameMode: (mode: GameMode) => void
  setSelectedClass: (cls: GameClass) => void
}

const GameContext = createContext<GameState | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("")
  const [companionType, setCompanionType] = useState<CompanionType | null>(null)
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [selectedClass, setSelectedClass] = useState<GameClass | null>(null)

  return (
    <GameContext.Provider
      value={{
        username,
        companionType,
        gameMode,
        selectedClass,
        setUsername,
        setCompanionType,
        setGameMode,
        setSelectedClass,
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
