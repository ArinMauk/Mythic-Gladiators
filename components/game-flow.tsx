"use client"

import { useState } from "react"
import { LoginScreen } from "./login-screen"
import { SignupScreen } from "./signup-screen"
import { GameTypeScreen } from "./game-type-screen"
import { ClassSelectionScreen } from "./class-selection-screen"
import { SkillSelectionScreen } from "./skill-selection-screen"
import { LevelSelectionScreen } from "./level-selection-screen"
import { GameArenaScreen } from "./game-arena-screen"

type Screen = "login" | "signup" | "game-type" | "class-selection" | "skill-selection" | "level-selection" | "game"

import { useEffect } from "react"
import { useGame } from "@/lib/game-context"

export function GameFlow() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")

  useEffect(() => {
    console.log(`=== [GameFlow] Screen Transition -> ${currentScreen} ===`)
  }, [currentScreen])

  const { 
    isMultiplayer, setIsMultiplayer, 
    isHost, setIsHost, 
    roomId, setRoomId, 
    setGameMode, 
    companionType, setCompanionType 
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
        // Default to players companion in joining mode
        setCompanionType("players")
        // The game mode will be updated upon synchronization with host,
        // but default to pve for initial screen gating
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
        setCurrentScreen("game-type")
        break
      case "game-type":
        setCurrentScreen("class-selection")
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
      case "game-type":
        setCurrentScreen("login")
        break
      case "class-selection":
        setCurrentScreen("game-type")
        break
      case "skill-selection":
        setCurrentScreen("class-selection")
        break
      case "level-selection":
        setCurrentScreen("skill-selection")
        break
      case "game":
        setCurrentScreen("level-selection")
        break
    }
  }

  const handleSignup = () => {
    setCurrentScreen("signup")
  }

  return (
    <main className="min-h-screen bg-background">
      {currentScreen === "login" && <LoginScreen onNext={handleNext} onSignup={handleSignup} />}
      {currentScreen === "signup" && <SignupScreen onNext={handleNext} onBack={handleBack} />}
      {currentScreen === "game-type" && <GameTypeScreen onNext={handleNext} onBack={handleBack} />}
      {currentScreen === "class-selection" && <ClassSelectionScreen onNext={handleNext} onBack={handleBack} />}
      {currentScreen === "skill-selection" && <SkillSelectionScreen onNext={handleNext} onBack={handleBack} />}
      {currentScreen === "level-selection" && <LevelSelectionScreen onNext={handleNext} onBack={handleBack} />}
      {currentScreen === "game" && <GameArenaScreen onBack={handleBack} />}
    </main>
  )
}
