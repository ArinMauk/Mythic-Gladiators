"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type CompanionType = "ai" | "players"
type GameMode = "pvp" | "pve"
type GameClass = "warrior" | "priest" | "hunter" | "rogue" | "mage" | "warlock" | "paladin" | "shaman"
export type LevelId = "level-1" | "level-2"

export interface CheatState {
  godMode: boolean
  noCooldowns: boolean
  instantCast: boolean
  speedMultiplier: number
  damageMultiplier: number
  healingMultiplier: number
  level: number
  gold: number
}

interface GameState {
  username: string
  companionType: CompanionType | null
  gameMode: GameMode | null
  selectedClass: GameClass | null
  selectedLevel: LevelId
  selectedTalents: string[]
  isMultiplayer: boolean
  isHost: boolean
  roomId: string
  cheats: CheatState
  setUsername: (name: string) => void
  setCompanionType: (type: CompanionType) => void
  setGameMode: (mode: GameMode) => void
  setSelectedClass: (cls: GameClass) => void
  setSelectedLevel: (level: LevelId) => void
  setSelectedTalents: (talents: string[]) => void
  setIsMultiplayer: (v: boolean) => void
  setIsHost: (v: boolean) => void
  setRoomId: (v: string) => void
  updateCheat: (key: keyof CheatState, value: any) => void
}

const GameContext = createContext<GameState | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState("")
  const [companionType, setCompanionType] = useState<CompanionType | null>(null)
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [selectedClass, setSelectedClass] = useState<GameClass | null>(null)
  const [selectedLevel, setSelectedLevel] = useState<LevelId>("level-1")
  const [selectedTalents, setSelectedTalents] = useState<string[]>([])
  const [isMultiplayer, setIsMultiplayer] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [roomId, setRoomId] = useState("")
  const [cheats, setCheats] = useState<CheatState>({
    godMode: false,
    noCooldowns: false,
    instantCast: false,
    speedMultiplier: 1.0,
    damageMultiplier: 1.0,
    healingMultiplier: 1.0,
    level: 1,
    gold: 100,
  })

  const updateCheat = (key: keyof CheatState, value: any) => {
    setCheats((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <GameContext.Provider
      value={{
        username,
        companionType,
        gameMode,
        selectedClass,
        selectedLevel,
        selectedTalents,
        isMultiplayer,
        isHost,
        roomId,
        cheats,
        setUsername,
        setCompanionType,
        setGameMode,
        setSelectedClass,
        setSelectedLevel,
        setSelectedTalents,
        setIsMultiplayer,
        setIsHost,
        setRoomId,
        updateCheat,
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
