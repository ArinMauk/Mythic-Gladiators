"use client"

import React, { useState } from "react"
import { useGame } from "@/lib/game-context"
import { CharacterModel, GameClass } from "@/lib/progression/types"
import { getXpRequiredForNextLevel, isMaxLevel } from "@/lib/progression/config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Shield,
  Heart,
  Crosshair,
  BadgeX as Dagger,
  Flame,
  Skull,
  Sun,
  Sparkles,
  Award,
  Coins,
  Plus,
  Trash2,
  LogOut,
  Play,
  Swords,
  ChevronRight,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface CharacterSelectionScreenProps {
  onSelectCharacter: (char: CharacterModel) => void
  onQuickplay: () => void
  onLogout: () => void
}

const classMetadata: Record<
  GameClass,
  { name: string; icon: any; color: string; bg: string; border: string }
> = {
  warrior: { name: "Warrior", icon: Shield, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30" },
  priest: { name: "Priest", icon: Heart, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  hunter: { name: "Hunter", icon: Crosshair, color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/30" },
  rogue: { name: "Rogue", icon: Dagger, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  mage: { name: "Mage", icon: Flame, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  warlock: { name: "Warlock", icon: Skull, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
  paladin: { name: "Paladin", icon: Sun, color: "text-yellow-300", bg: "bg-yellow-300/10", border: "border-yellow-300/30" },
  shaman: { name: "Shaman", icon: Sparkles, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
}

export function CharacterSelectionScreen({
  onSelectCharacter,
  onQuickplay,
  onLogout,
}: CharacterSelectionScreenProps) {
  const { user, characters, setCharacters, refreshCharacters } = useGame()

  const [isCreating, setIsCreating] = useState(false)
  const [newCharName, setNewCharName] = useState("")
  const [newCharClass, setNewCharClass] = useState<GameClass>("warrior")
  const [creationError, setCreationError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCharName.trim()) {
      setCreationError("Please enter a gladiator name")
      return
    }

    setIsSubmitting(true)
    setCreationError("")

    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCharName.trim(),
          class: newCharClass,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setCreationError(data.error || "Failed to create character")
        setIsSubmitting(false)
        return
      }

      setNewCharName("")
      setIsCreating(false)
      await refreshCharacters()
      onSelectCharacter(data.character)
    } catch (err) {
      setCreationError("Network error while creating character")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteCharacter = async (charId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this gladiator? This cannot be undone.")) {
      return
    }

    setDeletingId(charId)
    try {
      const res = await fetch(`/api/characters/${charId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setCharacters(characters.filter((c) => c.id !== charId))
      }
    } catch (err) {
      console.error("Failed to delete character:", err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen p-4 sm:p-8 bg-[url('/dark-fantasy-castle-battlefield-night-sky.jpg')] bg-cover bg-center flex flex-col justify-between overflow-y-auto">
      <div className="fixed inset-0 bg-background/85 backdrop-blur-sm pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto w-full space-y-6">
        {/* Top Bar */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 text-primary">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black uppercase tracking-wider text-foreground">
                Gladiator Roster
              </h1>
              <p className="text-xs text-zinc-400">
                Account: <span className="text-primary font-bold">{user?.username}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={onQuickplay}
              className="text-xs border-zinc-700 hover:border-zinc-500 text-zinc-300 font-bold"
            >
              <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Quick Play (Sandbox)
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </header>

        {/* Character List Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm uppercase tracking-wider text-zinc-400 font-extrabold">
              Your Champions ({characters.length})
            </h2>
            {!isCreating && (
              <Button
                onClick={() => setIsCreating(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 mr-1" />
                New Gladiator
              </Button>
            )}
          </div>

          {/* Creation Form Modal/Card */}
          {isCreating && (
            <Card className="border-primary/40 bg-zinc-900/95 shadow-2xl animate-in fade-in slide-in-from-top-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-black uppercase tracking-wider text-foreground">
                  Recruit New Gladiator
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Select a class and forge your champion.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCharacter} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="char-name" className="text-xs font-bold text-zinc-300">
                      Gladiator Name
                    </Label>
                    <Input
                      id="char-name"
                      placeholder="e.g. Grommash"
                      value={newCharName}
                      onChange={(e) => {
                        setNewCharName(e.target.value)
                        setCreationError("")
                      }}
                      maxLength={16}
                      className="bg-zinc-950 border-zinc-800 text-sm font-semibold text-zinc-100"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-zinc-300">Choose Class</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(Object.keys(classMetadata) as GameClass[]).map((cls) => {
                        const meta = classMetadata[cls]
                        const Icon = meta.icon
                        const isSelected = newCharClass === cls
                        return (
                          <button
                            key={cls}
                            type="button"
                            onClick={() => setNewCharClass(cls)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-200",
                              meta.bg,
                              isSelected
                                ? "border-primary bg-primary/20 scale-105 shadow-md shadow-primary/20 text-foreground"
                                : "border-zinc-800 hover:border-zinc-700 text-zinc-400"
                            )}
                          >
                            <Icon className={cn("w-5 h-5 mb-1", isSelected ? meta.color : "text-zinc-500")} />
                            <span className="text-xs font-bold capitalize">{meta.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {creationError && (
                    <p className="text-destructive text-xs font-bold text-center">{creationError}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider text-xs py-3"
                    >
                      {isSubmitting ? "Forging..." : "Enter Arena with Gladiator"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreating(false)
                        setCreationError("")
                      }}
                      className="border-zinc-800 text-xs text-zinc-400 font-bold"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Roster Cards */}
          {characters.length === 0 && !isCreating ? (
            <Card className="border-dashed border-zinc-800 bg-zinc-900/40 text-center p-12">
              <div className="w-16 h-16 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto mb-4 text-zinc-500">
                <Swords className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">No Gladiators Recruited Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-6">
                Create your first gladiator to embark on your progression journey, earn XP, level up, and unlock talents.
              </p>
              <Button
                onClick={() => setIsCreating(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider px-6"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Your First Gladiator
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {characters.map((char) => {
                const meta = classMetadata[char.class] || classMetadata.warrior
                const Icon = meta.icon
                const maxed = isMaxLevel(char.level)
                const xpForNext = getXpRequiredForNextLevel(char.level)
                const pct = maxed
                  ? 100
                  : xpForNext > 0
                  ? Math.min(100, Math.floor((char.xp / xpForNext) * 100))
                  : 100

                return (
                  <Card
                    key={char.id}
                    onClick={() => onSelectCharacter(char)}
                    className={cn(
                      "group cursor-pointer border-2 transition-all duration-200 relative overflow-hidden flex flex-col justify-between hover:scale-[1.01]",
                      "bg-zinc-900/90 border-zinc-800 hover:border-primary/60 shadow-xl"
                    )}
                  >
                    <div className="p-5 space-y-4">
                      {/* Card Header: Class Icon + Name + Delete */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner",
                              meta.bg,
                              meta.border
                            )}
                          >
                            <Icon className={cn("w-6 h-6", meta.color)} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                                {char.name}
                              </h3>
                              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {meta.name}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-400 font-semibold">
                              Level {char.level} {maxed ? "(Max Level)" : ""}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteCharacter(char.id, e)}
                          disabled={deletingId === char.id}
                          className="opacity-40 hover:opacity-100 text-zinc-500 hover:text-red-400 p-1.5 rounded transition-all"
                          title="Delete Gladiator"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* XP Progress Bar */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-zinc-400">Experience</span>
                          <span className="text-zinc-300 font-mono">
                            {maxed ? `${char.xp} XP (Max)` : `${char.xp} / ${xpForNext} XP (${pct}%)`}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Stat Pills */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="flex items-center gap-2 bg-zinc-950/70 border border-zinc-800/80 px-3 py-2 rounded-lg">
                          <Coins className="w-4 h-4 text-yellow-400" />
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block leading-none">
                              Gold
                            </span>
                            <span className="text-xs font-black font-mono text-zinc-200">
                              {char.gold}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 bg-zinc-950/70 border border-zinc-800/80 px-3 py-2 rounded-lg">
                          <Award className="w-4 h-4 text-amber-400" />
                          <div>
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block leading-none">
                              Talent Pts
                            </span>
                            <span className={cn(
                              "text-xs font-black font-mono",
                              char.unspentTalentPoints > 0 ? "text-amber-400 animate-pulse" : "text-zinc-400"
                            )}>
                              {char.unspentTalentPoints} Unspent
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Enter Arena Button */}
                    <div className="border-t border-zinc-800/80 bg-zinc-950/40 p-3 px-5 flex items-center justify-between group-hover:bg-primary/10 transition-colors">
                      <span className="text-xs font-bold text-zinc-400 group-hover:text-primary transition-colors flex items-center gap-1">
                        <Play className="w-3.5 h-3.5" />
                        Enter Arena
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <footer className="relative z-10 text-center text-zinc-600 text-xs py-4">
        Mythic Gladiators • Persistent Progression Enabled
      </footer>
    </div>
  )
}
