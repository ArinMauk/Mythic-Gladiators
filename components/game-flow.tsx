"use client"

import { useState } from "react"
import { LoginScreen } from "./login-screen"
import { SignupScreen } from "./signup-screen"
import { GameTypeScreen } from "./game-type-screen"
import { ClassSelectionScreen } from "./class-selection-screen"
import { LevelSelectionScreen } from "./level-selection-screen"
import { GameArenaScreen } from "./game-arena-screen"

type Screen = "login" | "signup" | "game-type" | "class-selection" | "level-selection" | "game"

export function GameFlow() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("login")

  const handleNext = () => {
    switch (currentScreen) {
      case "login":
      case "signup":
        setCurrentScreen("game-type")
        break
      case "game-type":
        setCurrentScreen("class-selection")
        break
      case "class-selection":
        setCurrentScreen("level-selection")
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
      case "level-selection":
        setCurrentScreen("class-selection")
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
      {currentScreen === "level-selection" && <LevelSelectionScreen onNext={handleNext} onBack={handleBack} />}
      {currentScreen === "game" && <GameArenaScreen onBack={handleBack} />}
    </main>
  )
}
