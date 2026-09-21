"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react"
import { CharacterModel, UserModel, GameClass } from "@/lib/progression/types"
import { LevelId } from "@/lib/progression/config"

type CompanionType = "ai" | "players"
type GameMode = "pvp" | "pve"
export type { LevelId, GameClass }

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
  user: UserModel | null
  activeCharacter: CharacterModel | null
  characters: CharacterModel[]
  isQuickplay: boolean
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
  setUser: (user: UserModel | null) => void
  setActiveCharacter: (character: CharacterModel | null) => void
  setCharacters: (chars: CharacterModel[]) => void
  setIsQuickplay: (val: boolean) => void
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
  refreshCharacters: () => Promise<void>
  logout: () => Promise<void>
}

const GameContext = createContext<GameState | undefined>(undefined)

export function GameProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserModel | null>(null)
  const [activeCharacter, setActiveCharacter] = useState<CharacterModel | null>(null)
  const [characters, setCharacters] = useState<CharacterModel[]>([])
  const [isQuickplay, setIsQuickplay] = useState(false)
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

  // Sync active character details into context
  const handleSetActiveCharacter = (char: CharacterModel | null) => {
    setActiveCharacter(char)
    if (char) {
      setSelectedClass(char.class)
      setSelectedTalents(char.selectedTalents || [])
      setUsername(char.name)
      setIsQuickplay(false)
    }
  }

  const refreshCharacters = async () => {
    try {
      const res = await fetch("/api/characters")
      if (res.ok) {
        const data = await res.json()
        setCharacters(data.characters || [])
        // If activeCharacter is selected, update it with fresh data
        if (activeCharacter) {
          const fresh = (data.characters || []).find(
            (c: CharacterModel) => c.id === activeCharacter.id
          )
          if (fresh) {
            setActiveCharacter(fresh)
            setSelectedTalents(fresh.selectedTalents || [])
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch characters:", err)
    }
  }

  // Restore session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            setUser(data.user)
            const charRes = await fetch("/api/characters")
            if (charRes.ok) {
              const charData = await charRes.json()
              setCharacters(charData.characters || [])
            }
          }
        }
      } catch (err) {
        console.error("Auth session check failed:", err)
      }
    }
    checkAuth()
  }, [])

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch (e) {
      // Ignore
    }
    setUser(null)
    setActiveCharacter(null)
    setCharacters([])
    setUsername("")
    setSelectedClass(null)
    setSelectedTalents([])
  }

  const updateCheat = (key: keyof CheatState, value: any) => {
    setCheats((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  return (
    <GameContext.Provider
      value={{
        user,
        activeCharacter,
        characters,
        isQuickplay,
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
        setUser,
        setActiveCharacter: handleSetActiveCharacter,
        setCharacters,
        setIsQuickplay,
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
        refreshCharacters,
        logout,
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
