"use client"

import { useGame, LevelId } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skull, Swords, ArrowLeft, Trophy, Flame, UserCheck, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

interface LevelSelectionScreenProps {
  onNext: () => void
  onBack: () => void
}

interface LevelInfo {
  id: LevelId
  name: string
  subtitle: string
  difficulty: "Hard" | "Expert"
  icon: typeof Skull
  description: string
  details: string[]
}

const levels: LevelInfo[] = [
  {
    id: "level-1",
    name: "Evil Raid Boss",
    subtitle: "Classic Raid Encounter",
    difficulty: "Hard",
    icon: Skull,
    description: "Prepare to face the ultimate challenge. A massive, high-health raid boss casting destructive spells and sweeping melee attacks.",
    details: [
      "1,500 HP Giant Boss",
      "Spawns 'Rain of Fire' AoE zones",
      "Executes 'Boss Smash' melee hits",
      "Demands high tank threat & dedicated healing",
    ],
  },
  {
    id: "level-2",
    name: "Gladiator Skirmish",
    subtitle: "Tactical 4v4 Arena Team Fight",
    difficulty: "Expert",
    icon: Swords,
    description: "Enter the skirmish arena against a balanced team of enemy gladiator champions. Requires high target priority and coordinated crowd control.",
    details: [
      "4 Distinct Enemy Gladiators",
      "Gladiator Captain (Warrior Tank)",
      "Gladiator Pyromancer (Mage DPS)",
      "Gladiator Scout (Hunter DPS)",
      "Gladiator Cleric (Priest Healer - Kill priority!)",
    ],
  },
]

export function LevelSelectionScreen({ onNext, onBack }: LevelSelectionScreenProps) {
  const { selectedLevel, setSelectedLevel } = useGame()

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
          <h1 className="text-4xl font-bold tracking-wider text-foreground">Select Your Arena Level</h1>
          <p className="text-muted-foreground">Select the encounter difficulty and trial type</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((lvl) => {
            const Icon = lvl.icon
            const isSelected = selectedLevel === lvl.id

            return (
              <Card
                key={lvl.id}
                onClick={() => setSelectedLevel(lvl.id)}
                className={cn(
                  "border-2 transition-all duration-300 cursor-pointer hover:border-primary/50 relative overflow-hidden flex flex-col justify-between",
                  isSelected
                    ? "border-primary bg-card/95 shadow-lg shadow-primary/10"
                    : "border-border bg-card/80 hover:bg-card/90"
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-bold rounded-bl-lg flex items-center gap-1.5 shadow">
                    <UserCheck className="w-3.5 h-3.5" />
                    Selected
                  </div>
                )}
                <div>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-14 h-14 rounded-xl flex items-center justify-center shadow-inner",
                          isSelected ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"
                        )}
                      >
                        <Icon className="w-7 h-7" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-foreground">{lvl.name}</CardTitle>
                        <CardDescription className="text-xs">{lvl.subtitle}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Difficulty:</span>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-bold border",
                          lvl.difficulty === "Hard"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-red-500/10 text-red-500 border-red-500/20"
                        )}
                      >
                        {lvl.difficulty}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">{lvl.description}</p>

                    <div className="border-t border-border/60 pt-4 space-y-2">
                      <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Encounter Intel:</p>
                      <ul className="space-y-1.5">
                        {lvl.details.map((detail, idx) => (
                          <li key={idx} className="text-xs flex items-center gap-2 text-zinc-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </div>

        <Button
          onClick={onNext}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold tracking-wider uppercase py-6 text-base shadow-xl transition-all duration-300 active:scale-[0.98]"
        >
          Enter the Battle Arena
        </Button>
      </div>
    </div>
  )
}
