"use client"

import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Bot, Users, Swords, Shield, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

interface GameTypeScreenProps {
  onNext: () => void
  onBack: () => void
}

export function GameTypeScreen({ onNext, onBack }: GameTypeScreenProps) {
  const { companionType, gameMode, setCompanionType, setGameMode } = useGame()

  const canProceed = companionType && gameMode

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/dark-fantasy-castle-battlefield-night-sky.jpg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-wider text-foreground">Choose Your Path</h1>
          <p className="text-muted-foreground">Select your companions and battle mode</p>
        </div>

        <Card className="border-primary/30 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Companion Type</CardTitle>
            <CardDescription>Who will fight alongside you?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setCompanionType("ai")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all duration-300",
                companionType === "ai"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary",
              )}
            >
              <Bot className={cn("w-10 h-10", companionType === "ai" ? "text-primary" : "")} />
              <div className="text-center">
                <p className="font-semibold">AI Companions</p>
                <p className="text-sm text-muted-foreground">Battle with intelligent allies</p>
              </div>
            </button>

            <button
              onClick={() => setCompanionType("players")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all duration-300",
                companionType === "players"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary",
              )}
            >
              <Users className={cn("w-10 h-10", companionType === "players" ? "text-primary" : "")} />
              <div className="text-center">
                <p className="font-semibold">Other Players</p>
                <p className="text-sm text-muted-foreground">Team up with real warriors</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Battle Mode</CardTitle>
            <CardDescription>How will you prove your worth?</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setGameMode("pvp")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all duration-300",
                gameMode === "pvp"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary",
              )}
            >
              <Swords className={cn("w-10 h-10", gameMode === "pvp" ? "text-primary" : "")} />
              <div className="text-center">
                <p className="font-semibold">PvP</p>
                <p className="text-sm text-muted-foreground">Player vs Player combat</p>
              </div>
            </button>

            <button
              onClick={() => setGameMode("pve")}
              className={cn(
                "flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all duration-300",
                gameMode === "pve"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary",
              )}
            >
              <Shield className={cn("w-10 h-10", gameMode === "pve" ? "text-primary" : "")} />
              <div className="text-center">
                <p className="font-semibold">PvE</p>
                <p className="text-sm text-muted-foreground">Player vs Environment</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide disabled:opacity-50"
        >
          Choose Your Class
        </Button>
      </div>
    </div>
  )
}
