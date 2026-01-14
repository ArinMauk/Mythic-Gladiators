"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Circle,
  Shield,
  Heart,
  Crosshair,
  BadgeX as Dagger,
  Flame,
  Skull,
  Sun,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface GameArenaScreenProps {
  onBack: () => void
}

interface Player {
  id: string
  name: string
  class: string
  x: number
  y: number
  health: number
  maxHealth: number
  isUser?: boolean
}

interface Boss {
  name: string
  x: number
  y: number
  health: number
  maxHealth: number
}

const classIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  warrior: Shield,
  priest: Heart,
  hunter: Crosshair,
  rogue: Dagger,
  mage: Flame,
  warlock: Skull,
  paladin: Sun,
  shaman: Sparkles,
}

const classColors: Record<string, string> = {
  warrior: "text-amber-500",
  priest: "text-emerald-400",
  hunter: "text-green-500",
  rogue: "text-yellow-400",
  mage: "text-blue-400",
  warlock: "text-purple-500",
  paladin: "text-yellow-300",
  shaman: "text-cyan-400",
}

const aiPlayers: Player[] = [
  { id: "bob", name: "Bob", class: "warrior", x: 120, y: 280, health: 100, maxHealth: 100 },
  { id: "jessica", name: "Jessica", class: "mage", x: 180, y: 220, health: 85, maxHealth: 100 },
  { id: "dillan", name: "Dillan", class: "priest", x: 140, y: 340, health: 100, maxHealth: 100 },
  { id: "sarah", name: "Sarah", class: "hunter", x: 200, y: 300, health: 70, maxHealth: 100 },
]

export function GameArenaScreen({ onBack }: GameArenaScreenProps) {
  const { username, selectedClass, companionType, gameMode } = useGame()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [players, setPlayers] = useState<Player[]>([
    ...aiPlayers.map((p) => ({ ...p })),
    {
      id: "user",
      name: username || "You",
      class: selectedClass || "warrior",
      x: 160,
      y: 260,
      health: 100,
      maxHealth: 100,
      isUser: true,
    },
  ])

  const [boss, setBoss] = useState<Boss>({
    name: "Evil Boss",
    x: 500,
    y: 260,
    health: 500,
    maxHealth: 500,
  })

  const [battleLog, setBattleLog] = useState<string[]>(["Battle has begun!"])
  const [isAttacking, setIsAttacking] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Sky
      ctx.fillStyle = "#1a1f2e"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Clouds
      ctx.fillStyle = "#3a4a6a"
      drawCloud(ctx, 400, 50, 60)
      drawCloud(ctx, 520, 80, 40)
      ctx.fillStyle = "#5a9fd4"
      drawCloud(ctx, 460, 40, 30)

      // Sun
      ctx.fillStyle = "#f59e0b"
      ctx.beginPath()
      ctx.arc(580, 60, 20, 0, Math.PI * 2)
      ctx.fill()

      // Ground
      ctx.fillStyle = "#2a3a2a"
      ctx.fillRect(0, 380, canvas.width, 120)

      // House
      ctx.fillStyle = "#4a3a2a"
      ctx.fillRect(530, 320, 60, 60)
      ctx.fillStyle = "#6a4a2a"
      ctx.beginPath()
      ctx.moveTo(520, 320)
      ctx.lineTo(560, 280)
      ctx.lineTo(600, 320)
      ctx.closePath()
      ctx.fill()

      // Draw players
      players.forEach((player) => {
        drawStickFigure(ctx, player.x, player.y, player.isUser ? "#f59e0b" : "#e0e0e0", player.name)
      })

      // Draw boss
      drawBoss(ctx, boss.x, boss.y, boss.name)
    }

    draw()
  }, [players, boss])

  const drawCloud = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.arc(x + size * 0.8, y - size * 0.3, size * 0.7, 0, Math.PI * 2)
    ctx.arc(x + size * 1.4, y, size * 0.6, 0, Math.PI * 2)
    ctx.fill()
  }

  const drawStickFigure = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string) => {
    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 2

    // Head
    ctx.beginPath()
    ctx.arc(x, y - 30, 8, 0, Math.PI * 2)
    ctx.stroke()

    // Body
    ctx.beginPath()
    ctx.moveTo(x, y - 22)
    ctx.lineTo(x, y + 5)
    ctx.stroke()

    // Arms
    ctx.beginPath()
    ctx.moveTo(x - 15, y - 10)
    ctx.lineTo(x + 15, y - 10)
    ctx.stroke()

    // Legs
    ctx.beginPath()
    ctx.moveTo(x, y + 5)
    ctx.lineTo(x - 10, y + 25)
    ctx.moveTo(x, y + 5)
    ctx.lineTo(x + 10, y + 25)
    ctx.stroke()

    // Name
    ctx.fillStyle = "#e0e0e0"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(name, x, y + 40)
  }

  const drawBoss = (ctx: CanvasRenderingContext2D, x: number, y: number, name: string) => {
    ctx.strokeStyle = "#ef4444"
    ctx.fillStyle = "#ef4444"
    ctx.lineWidth = 3

    // Large head
    ctx.beginPath()
    ctx.arc(x, y - 40, 20, 0, Math.PI * 2)
    ctx.stroke()

    // Evil eyes
    ctx.fillStyle = "#ef4444"
    ctx.beginPath()
    ctx.arc(x - 6, y - 45, 3, 0, Math.PI * 2)
    ctx.arc(x + 6, y - 45, 3, 0, Math.PI * 2)
    ctx.fill()

    // Body (larger)
    ctx.strokeStyle = "#ef4444"
    ctx.beginPath()
    ctx.moveTo(x, y - 20)
    ctx.lineTo(x, y + 30)
    ctx.stroke()

    // Arms (wider)
    ctx.beginPath()
    ctx.moveTo(x - 30, y)
    ctx.lineTo(x + 30, y)
    ctx.stroke()

    // Legs (wider)
    ctx.beginPath()
    ctx.moveTo(x, y + 30)
    ctx.lineTo(x - 20, y + 60)
    ctx.moveTo(x, y + 30)
    ctx.lineTo(x + 20, y + 60)
    ctx.stroke()

    // Name
    ctx.fillStyle = "#ef4444"
    ctx.font = "12px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText(name, x, y + 80)
  }

  const handleAttack = () => {
    if (isAttacking) return
    setIsAttacking(true)

    const damage = Math.floor(Math.random() * 30) + 20
    const userPlayer = players.find((p) => p.isUser)

    setBoss((prev) => ({
      ...prev,
      health: Math.max(0, prev.health - damage),
    }))

    setBattleLog((prev) => [`${userPlayer?.name} attacks ${boss.name} for ${damage} damage!`, ...prev.slice(0, 4)])

    setTimeout(() => {
      // Boss counterattack
      const bossTarget = players[Math.floor(Math.random() * players.length)]
      const bossDamage = Math.floor(Math.random() * 15) + 5

      setPlayers((prev) =>
        prev.map((p) => (p.id === bossTarget.id ? { ...p, health: Math.max(0, p.health - bossDamage) } : p)),
      )

      setBattleLog((prevLog) => [
        `${boss.name} strikes ${bossTarget.name} for ${bossDamage} damage!`,
        ...prevLog.slice(0, 4),
      ])

      setIsAttacking(false)
    }, 500)
  }

  const handleHeal = () => {
    const heal = Math.floor(Math.random() * 20) + 10
    setPlayers((prev) => prev.map((p) => (p.isUser ? { ...p, health: Math.min(p.maxHealth, p.health + heal) } : p)))
    setBattleLog((prev) => [`You healed for ${heal} HP!`, ...prev.slice(0, 4)])
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Leave Battle
        </button>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* Player List */}
          <Card className="lg:w-64 border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-foreground">Party</CardTitle>
              <p className="text-xs text-muted-foreground">
                {companionType === "ai" ? "AI Companions" : "Other Players"} - {gameMode?.toUpperCase()}
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {players.map((player) => {
                const Icon = classIcons[player.class] || Shield
                return (
                  <div
                    key={player.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      player.isUser ? "bg-primary/20 border border-primary/30" : "bg-secondary/50",
                    )}
                  >
                    <div className="relative">
                      <Circle
                        className={cn("w-8 h-8", player.health > 0 ? "text-muted-foreground" : "text-destructive")}
                      />
                      <Icon className={cn("w-4 h-4 absolute top-2 left-2", classColors[player.class])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium truncate",
                          player.isUser ? "text-primary" : "text-foreground",
                        )}
                      >
                        {player.name}
                      </p>
                      <div className="w-full bg-secondary rounded-full h-1.5 mt-1">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Game Canvas */}
          <Card className="flex-1 border-border bg-card overflow-hidden">
            <CardContent className="p-0">
              <canvas ref={canvasRef} width={650} height={500} className="w-full h-auto bg-card" />
            </CardContent>
          </Card>

          {/* Battle Info */}
          <div className="lg:w-64 space-y-4">
            {/* Boss Health */}
            <Card className="border-destructive/30 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-destructive">{boss.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">HP</span>
                    <span className="text-foreground">
                      {boss.health}/{boss.maxHealth}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-3">
                    <div
                      className="bg-destructive h-3 rounded-full transition-all"
                      style={{ width: `${(boss.health / boss.maxHealth) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  onClick={handleAttack}
                  disabled={isAttacking || boss.health <= 0}
                  className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Attack
                </Button>
                <Button
                  onClick={handleHeal}
                  variant="outline"
                  className="w-full border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 bg-transparent"
                >
                  Heal
                </Button>
              </CardContent>
            </Card>

            {/* Battle Log */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-foreground">Battle Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {battleLog.map((log, i) => (
                    <p key={i} className={cn("text-xs", i === 0 ? "text-foreground" : "text-muted-foreground")}>
                      {log}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {boss.health <= 0 && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <Card className="border-primary bg-card text-center p-8">
              <h2 className="text-3xl font-bold text-primary mb-4">Victory!</h2>
              <p className="text-muted-foreground mb-6">You have defeated {boss.name}!</p>
              <Button onClick={onBack} className="bg-primary text-primary-foreground">
                Return to Menu
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
