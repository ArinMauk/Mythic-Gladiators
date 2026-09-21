"use client"

import { useState, useEffect } from "react"
import { LoginScreen } from "./login-screen"
import { SignupScreen } from "./signup-screen"
import { CharacterSelectionScreen } from "./character-selection-screen"
import { GameTypeScreen } from "./game-type-screen"
import { ClassSelectionScreen } from "./class-selection-screen"
import { SkillSelectionScreen } from "./skill-selection-screen"
import { LevelSelectionScreen } from "./level-selection-screen"
import { GameArenaScreen } from "./game-arena-screen"
import { useGame } from "@/lib/game-context"
import { CharacterModel } from "@/lib/progression/types"

type Screen =
  | "login"
  | "signup"
  | "character-selection"
  | "game-type"
  | "class-selection"
  | "skill-selection"
  | "level-selection"
  | "game"

export function GameFlow() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")

  useEffect(() => {
    console.log(`=== [GameFlow] Screen Transition -> ${currentScreen} ===`)
  }, [currentScreen])

  const {
    user,
    activeCharacter,
    setActiveCharacter,
    setIsQuickplay,
    isMultiplayer,
    setIsMultiplayer,
    isHost,
    setIsHost,
    roomId,
    setRoomId,
    setGameMode,
    companionType,
    setCompanionType,
    logout,
  } = useGame()

  useEffect(() => {
    // Check if we are in a room URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const roomParam = params.get("room")
      if (roomParam) {
        setIsMultiplayer(true)
        setIsHost(false)
        setRoomId(roomParam)
        setCompanionType("players")
        setGameMode("pve")
      }
    }
  }, [])

  const handleNext = (target?: Screen) => {
    if (target && typeof target === "string") {
      setCurrentScreen(target)
      return
    }
    switch (currentScreen) {
      case "login":
      case "signup":
        setCurrentScreen("character-selection")
        break
      case "character-selection":
        setCurrentScreen("game-type")
        break
      case "game-type":
        if (activeCharacter) {
          setCurrentScreen("skill-selection")
        } else {
          setCurrentScreen("class-selection")
        }
        break
      case "class-selection":
        setCurrentScreen("skill-selection")
        break
      case "skill-selection":
        if (companionType === "players" || isMultiplayer) {
          if (!isMultiplayer) {
            setIsMultiplayer(true)
            setIsHost(true)
            const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
            setRoomId(randomCode)
          }
          setCurrentScreen("game")
        } else {
          setCurrentScreen("level-selection")
        }
        break
      case "level-selection":
        setCurrentScreen("game")
        break
    }
  }

  const handleBack = () => {
    switch (currentScreen) {
      case "signup":
        setCurrentScreen("login")
        break
      case "character-selection":
        setCurrentScreen("login")
        break
      case "game-type":
        if (activeCharacter || user) {
          setCurrentScreen("character-selection")
        } else {
          setCurrentScreen("login")
        }
        break
      case "class-selection":
        setCurrentScreen("game-type")
        break
      case "skill-selection":
        if (activeCharacter) {
          setCurrentScreen("game-type")
        } else {
          setCurrentScreen("class-selection")
        }
        break
      case "level-selection":
        setCurrentScreen("skill-selection")
        break
      case "game":
        if (activeCharacter) {
          setCurrentScreen("character-selection")
        } else {
          setCurrentScreen("level-selection")
        }
        break
    }
  }

  const handleSignup = () => {
    setCurrentScreen("signup")
  }

  const handleSelectCharacter = (char: CharacterModel) => {
    setActiveCharacter(char)
    setIsQuickplay(false)
    setCurrentScreen("game-type")
  }

  const handleQuickplayFromRoster = () => {
    setIsQuickplay(true)
    setActiveCharacter(null)
    setCurrentScreen("skill-selection")
  }

  const handleLogoutFromRoster = async () => {
    await logout()
    setCurrentScreen("login")
  }

  return (
    <main className="min-h-screen bg-background">
      {currentScreen === "login" && (
        <LoginScreen onNext={handleNext} onSignup={handleSignup} />
      )}
      {currentScreen === "signup" && (
        <SignupScreen onNext={handleNext} onBack={handleBack} />
      )}
      {currentScreen === "character-selection" && (
        <CharacterSelectionScreen
          onSelectCharacter={handleSelectCharacter}
          onQuickplay={handleQuickplayFromRoster}
          onLogout={handleLogoutFromRoster}
        />
      )}
      {currentScreen === "game-type" && (
        <GameTypeScreen onNext={handleNext} onBack={handleBack} />
      )}
      {currentScreen === "class-selection" && (
        <ClassSelectionScreen onNext={handleNext} onBack={handleBack} />
      )}
      {currentScreen === "skill-selection" && (
        <SkillSelectionScreen onNext={handleNext} onBack={handleBack} />
      )}
      {currentScreen === "level-selection" && (
        <LevelSelectionScreen onNext={handleNext} onBack={handleBack} />
      )}
      {currentScreen === "game" && <GameArenaScreen onBack={handleBack} />}
    </main>
  )
}
