"use client"

import type React from "react"

import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Shield, Heart, Crosshair, BadgeX as Dagger, Flame, Skull, Sun, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface ClassSelectionScreenProps {
  onNext: () => void
  onBack: () => void
}

type GameClass = "warrior" | "priest" | "hunter" | "rogue" | "mage" | "warlock" | "paladin" | "shaman"

interface ClassInfo {
  id: GameClass
  name: string
  role: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const classes: ClassInfo[] = [
  {
    id: "warrior",
    name: "Warrior",
    role: "Tank / Damage",
    icon: Shield,
    description: "Masters of weapons and armor",
  },
  {
    id: "priest",
    name: "Priest",
    role: "Healer",
    icon: Heart,
    description: "Divine healers and protectors",
  },
  {
    id: "hunter",
    name: "Hunter",
    role: "Damage",
    icon: Crosshair,
    description: "Deadly ranged specialists",
  },
  {
    id: "rogue",
    name: "Rogue",
    role: "Damage",
    icon: Dagger,
    description: "Silent assassins of the shadows",
  },
  {
    id: "mage",
    name: "Mage",
    role: "Damage",
    icon: Flame,
    description: "Wielders of arcane devastation",
  },
  {
    id: "warlock",
    name: "Warlock",
    role: "Damage",
    icon: Skull,
    description: "Dark magic and demons",
  },
  {
    id: "paladin",
    name: "Paladin",
    role: "Tank / Healer",
    icon: Sun,
    description: "Holy warriors of light",
  },
  {
    id: "shaman",
    name: "Shaman",
    role: "Damage / Healer",
    icon: Sparkles,
    description: "Elemental masters",
  },
]

export function ClassSelectionScreen({ onNext, onBack }: ClassSelectionScreenProps) {
  const { selectedClass, setSelectedClass } = useGame()

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/dark-fantasy-castle-battlefield-night-sky.jpg')] bg-cover bg-center">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-4xl space-y-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-wider text-foreground">Choose Your Class</h1>
          <p className="text-muted-foreground">Select a champion to represent you in battle</p>
        </div>

        <Card className="border-primary/30 bg-card/95 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Available Classes</CardTitle>
            <CardDescription>Each class brings unique abilities to the arena</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {classes.map((cls) => {
                const Icon = cls.icon
                const isSelected = selectedClass === cls.id

                return (
                  <button
                    key={cls.id}
                    onClick={() => setSelectedClass(cls.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-300",
                      isSelected
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border bg-secondary/50 text-muted-foreground hover:border-primary/50 hover:bg-secondary",
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center",
                        isSelected ? "bg-primary/20" : "bg-secondary",
                      )}
                    >
                      <Icon className={cn("w-6 h-6", isSelected ? "text-primary" : "")} />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">{cls.role}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            {selectedClass && (
              <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center gap-4">
                  {(() => {
                    const selected = classes.find((c) => c.id === selectedClass)
                    if (!selected) return null
                    const Icon = selected.icon
                    return (
                      <>
                        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                          <Icon className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{selected.name}</h3>
                          <p className="text-sm text-primary">{selected.role}</p>
                          <p className="text-sm text-muted-foreground mt-1">{selected.description}</p>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button
          onClick={onNext}
          disabled={!selectedClass}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold tracking-wide disabled:opacity-50"
        >
          Enter Battle
        </Button>
      </div>
    </div>
  )
}
