"use client"

import React, { useState, useEffect, useRef } from "react"
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
  Zap,
  Activity,
  Sword,
  Wind,
  Moon,
  Droplet,
  LucideProps
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CombatSimulation } from "@/lib/combat/simulation"
import { Actor } from "@/lib/combat/actor"
import { getClassAbilities, Ability } from "@/lib/combat/ability"
import ArenaCanvasContainer from "./arena-3d-canvas"

interface GameArenaScreenProps {
  onBack: () => void
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

const abilityIcons: Record<string, React.ComponentType<LucideProps>> = {
  Shield,
  Heart,
  Crosshair,
  Sparkles,
  Flame,
  Skull,
  Sun,
  Zap,
  Activity,
  Sword,
  Wind,
  Moon,
  Droplet
}

export function GameArenaScreen({ onBack }: GameArenaScreenProps) {
  const { username, selectedClass, companionType, gameMode } = useGame()
  
  // 1. Initialize the 3D Combat Simulation Engine (persists in ref)
  const simRef = useRef<CombatSimulation | null>(null)
  if (!simRef.current) {
    simRef.current = new CombatSimulation(username, selectedClass || "warrior")
  }
  const simulation = simRef.current

  const player = simulation.playerActor
  const boss = simulation.bossActor

  // State to trigger React HUD updates (updated periodically at 10hz from state)
  const [selectedTarget, setSelectedTarget] = useState<Actor | null>(player.target)
  const [battleLog, setBattleLog] = useState<string[]>([...simulation.battleLog])
  const [party, setParty] = useState<Actor[]>([...simulation.actors.filter(a => a.faction === "player")])
  const [bossHp, setBossHp] = useState(boss.health)
  const [playerHp, setPlayerHp] = useState(player.health)
  const [playerResources, setPlayerResources] = useState({ ...player.resources })
  const [cooldowns, setCooldowns] = useState<Record<string, number>>({})
  const [gcdRemaining, setGcdRemaining] = useState(0)

  // Abilities lists
  const playerAbilities = getClassAbilities(player.class)

  // Periodic React state pull (10Hz) to prevent performance issues
  useEffect(() => {
    simulation.onLogUpdate = (newLogs) => {
      setBattleLog(newLogs)
    }

    const interval = setInterval(() => {
      // Sync party health / resources
      setParty([...simulation.actors.filter(a => a.faction === "player")])
      setBossHp(boss.health)
      setPlayerHp(player.health)
      setPlayerResources({ ...player.resources })
      setGcdRemaining(player.gcdRemaining)
      
      // Update targeted actor reference
      setSelectedTarget(player.target)

      // Sync active cooldowns
      const cds: Record<string, number> = {}
      playerAbilities.forEach((ab) => {
        cds[ab.id] = player.getCooldown(ab.id)
      })
      setCooldowns(cds)
    }, 100)

    return () => {
      clearInterval(interval)
    }
  }, [simulation, player, boss, playerAbilities])

  // Keybinding Listeners (1 and 2 keys for Abilities)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "1") {
        e.preventDefault()
        castAbility(playerAbilities[0])
      } else if (e.key === "2") {
        e.preventDefault()
        castAbility(playerAbilities[1])
      }
    }

    window.addEventListener("keydown", handleKeys)
    return () => {
      window.removeEventListener("keydown", handleKeys)
    }
  }, [playerAbilities, selectedTarget])

  const castAbility = (ability: Ability) => {
    if (!ability) return
    if (player.health <= 0 || boss.health <= 0) return
    
    // Attempt casting on currently selected target
    ability.startCast(player, player.target, simulation)
  }

  // Combat status indicators
  const isVictory = bossHp <= 0
  const isDefeat = playerHp <= 0

  return (
    <div className="min-h-screen bg-zinc-950 p-4 font-sans text-zinc-200 selection:bg-amber-500/30 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Header Row */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Leave Battle
          </button>
          <div className="bg-zinc-900/80 border border-zinc-800/80 px-3 py-1 rounded-full text-xs text-zinc-400 font-medium">
            Game Mode: <span className="text-zinc-200 font-bold">{gameMode?.toUpperCase() || "PVE"}</span> | Companion: <span className="text-zinc-200 font-bold">{companionType?.toUpperCase() || "AI"}</span>
          </div>
        </div>

        {/* HUD Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          
          {/* Column 1: WoW-style Party Frames */}
          <Card className="lg:col-span-1 border-zinc-800 bg-zinc-900/70 backdrop-blur shadow-xl h-fit">
            <CardHeader className="pb-2 border-b border-zinc-800/60">
              <CardTitle className="text-base text-zinc-200 tracking-wider font-extrabold uppercase flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Dungeon Party
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-2.5">
              {party.map((member) => {
                const Icon = classIcons[member.class] || Shield
                const isSelected = selectedTarget?.id === member.id
                const isUserMember = member.id === "user"
                const hpPercent = (member.health / member.maxHealth) * 100
                
                // Determine resource display
                let currentRes = 0
                let maxRes = 100
                let resColor = "bg-blue-500"
                if (member.class === "warrior") {
                  currentRes = member.resources.rage
                  maxRes = member.maxResources.rage
                  resColor = "bg-red-500"
                } else if (member.class === "rogue") {
                  currentRes = member.resources.energy
                  maxRes = member.maxResources.energy
                  resColor = "bg-yellow-500"
                } else if (member.class === "hunter") {
                  currentRes = member.resources.focus
                  maxRes = member.maxResources.focus
                  resColor = "bg-green-600"
                } else {
                  currentRes = member.resources.mana
                  maxRes = member.maxResources.mana
                  resColor = "bg-blue-500"
                }
                const resPercent = (currentRes / maxRes) * 100

                return (
                  <button
                    key={member.id}
                    onClick={() => {
                      player.target = member
                      setSelectedTarget(member)
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all relative border overflow-hidden",
                      isSelected 
                        ? "bg-amber-500/15 border-amber-500/50 shadow-md" 
                        : isUserMember
                          ? "bg-zinc-800/50 border-zinc-700/60 hover:bg-zinc-800"
                          : "bg-zinc-950/40 border-zinc-800/40 hover:bg-zinc-900/40",
                      member.health <= 0 ? "opacity-50" : ""
                    )}
                  >
                    {/* Class Icon */}
                    <div className="relative flex-shrink-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full bg-zinc-900/90 border border-zinc-700 flex items-center justify-center shadow",
                        member.health <= 0 ? "border-red-500/50" : ""
                      )}>
                        <Icon className={cn("w-4 h-4", classColors[member.class])} />
                      </div>
                      {isUserMember && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 text-[8px] font-black rounded-full flex items-center justify-center text-zinc-950 border border-zinc-950">
                          YOU
                        </span>
                      )}
                    </div>

                    {/* Unit Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={cn(
                          "text-xs font-bold truncate",
                          isUserMember ? "text-amber-400" : "text-zinc-200"
                        )}>
                          {member.name}
                        </p>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {member.health <= 0 ? "DEAD" : `${member.health} HP`}
                        </span>
                      </div>

                      {/* HP Bar */}
                      <div className="w-full bg-zinc-950 rounded-full h-2 mt-1 border border-zinc-800/50">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-150"
                          style={{ width: `${hpPercent}%` }}
                        />
                      </div>

                      {/* Resource Bar (Mana/Energy/Rage/Focus) */}
                      {member.health > 0 && maxRes > 0 && (
                        <div className="w-full bg-zinc-950 rounded-full h-1 mt-0.5 border border-zinc-800/30">
                          <div
                            className={cn(resColor, "h-full rounded-full transition-all duration-150")}
                            style={{ width: `${resPercent}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {/* Column 2 & 3: Main 3D Game Canvas Area */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* 3D Game Scene */}
            <ArenaCanvasContainer 
              simulation={simulation} 
              onSelectTarget={(actor) => setSelectedTarget(actor)} 
            />

            {/* Dynamic Real-time Cast Bar overlay */}
            {player.isCasting && (
              <div className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 flex flex-col items-center justify-center relative shadow-lg overflow-hidden">
                <div className="absolute top-0 left-0 bottom-0 bg-yellow-500/10 transition-all duration-75" style={{ width: `${(1 - player.castTimeRemaining / player.castTimeTotal) * 100}%` }} />
                <span className="text-xs font-black tracking-wider uppercase text-yellow-300 z-10 flex items-center gap-1.5 animate-pulse">
                  <Flame className="w-3.5 h-3.5" />
                  Casting: {player.castName} ({player.castTimeRemaining.toFixed(1)}s)
                </span>
                <div className="w-full bg-zinc-950 h-2 rounded mt-1.5 border border-zinc-800 relative z-10 overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 transition-all duration-100"
                    style={{ width: `${(1 - player.castTimeRemaining / player.castTimeTotal) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* World of Warcraft-style Action bar */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex flex-col items-center gap-3 shadow-xl backdrop-blur">
              <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest border-b border-zinc-800/60 pb-1 w-full text-center">
                Spells & Abilities
              </div>
              <div className="flex gap-4 items-center justify-center">
                {playerAbilities.map((ability, idx) => {
                  const Icon = abilityIcons[ability.icon] || Shield
                  const remainingCD = cooldowns[ability.id] || 0
                  const isAvailable = remainingCD <= 0 && gcdRemaining <= 0
                  const hasResource = player.currentResource(ability.cost.resource) >= ability.cost.amount
                  
                  // Radial sweep timer percentage
                  const isSweep = !isAvailable
                  let sweepPct = 0
                  if (remainingCD > 0) {
                    sweepPct = (remainingCD / ability.cooldown) * 100
                  } else if (gcdRemaining > 0) {
                    sweepPct = (gcdRemaining / 1.5) * 100
                  }

                  return (
                    <div key={ability.id} className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => castAbility(ability)}
                        disabled={player.health <= 0 || boss.health <= 0}
                        className={cn(
                          "w-14 h-14 rounded-xl relative border-2 flex items-center justify-center group transition-all duration-300 shadow-md",
                          isAvailable && hasResource
                            ? "bg-zinc-950 border-amber-500/30 hover:border-amber-400 hover:scale-105 active:scale-95"
                            : "bg-zinc-950/80 border-zinc-800 brightness-75 grayscale-[40%]",
                          !hasResource ? "border-red-500/40" : ""
                        )}
                      >
                        {/* Cooldown radial overlay */}
                        {isSweep && (
                          <div 
                            className="absolute inset-0 bg-black/75 rounded-[10px] flex items-center justify-center text-xs font-black text-amber-400 z-20"
                          >
                            {remainingCD > 0 ? remainingCD.toFixed(1) : ""}
                          </div>
                        )}

                        {/* Ability Icon */}
                        <Icon className={cn("w-6 h-6", isAvailable && hasResource ? "text-amber-400" : "text-zinc-500")} />

                        {/* Hotkey tag */}
                        <span className="absolute -top-2 -right-2 bg-zinc-800 border border-zinc-700 font-mono text-[9px] px-1 py-0.5 rounded-md text-zinc-400 group-hover:text-zinc-200 transition-colors z-30 shadow">
                          {idx + 1}
                        </span>

                        {/* Resource dot */}
                        {!hasResource && (
                          <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-red-500 animate-ping z-30" />
                        )}
                      </button>

                      {/* Spell Details */}
                      <span className="text-[10px] font-bold text-zinc-400 truncate max-w-[80px]">
                        {ability.name}
                      </span>
                      <span className="text-[8px] text-zinc-500 font-mono">
                        {ability.cost.amount > 0 ? `${ability.cost.amount} ${ability.cost.resource}` : "FREE"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Column 4: Boss Frame & Battle Info & Log */}
          <div className="lg:col-span-1 space-y-4">
            
            {/* Target/Boss Frame */}
            <Card className="border-red-950/50 bg-zinc-900/60 backdrop-blur shadow-xl">
              <CardHeader className="pb-2 border-b border-zinc-800/60 bg-red-950/10">
                <CardTitle className="text-sm font-extrabold text-red-500 uppercase tracking-wider flex items-center gap-2">
                  <Skull className="w-4 h-4 text-red-500" />
                  Target Unit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {selectedTarget ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-xs font-bold text-zinc-200">{selectedTarget.name}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wide">
                          Class: <span className={cn(classColors[selectedTarget.class], "font-bold")}>{selectedTarget.class}</span>
                        </p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border border-white/5",
                        selectedTarget.faction === "enemy" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
                      )}>
                        {selectedTarget.faction}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-zinc-400">Health</span>
                        <span className="text-zinc-200 font-bold">
                          {selectedTarget.health} / {selectedTarget.maxHealth}
                        </span>
                      </div>
                      {/* Health Bar */}
                      <div className="w-full bg-zinc-950 rounded-full h-3 border border-zinc-800/50 overflow-hidden">
                        <div
                          className="bg-red-500 h-full rounded-full transition-all duration-100"
                          style={{ width: `${(selectedTarget.health / selectedTarget.maxHealth) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Threat / Aggro Map if Boss */}
                    {selectedTarget.class === "boss" && (
                      <div className="bg-zinc-950/80 border border-zinc-800/40 p-2 rounded text-[10px] space-y-1">
                        <span className="font-bold text-zinc-400 text-[9px] uppercase tracking-wider">Threat List:</span>
                        {Array.from(selectedTarget.threatMap.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 3)
                          .map(([actorId, threat]) => {
                            const act = simulation.actors.find(a => a.id === actorId)
                            return (
                              <div key={actorId} className="flex justify-between font-mono text-zinc-500">
                                <span className={act?.isUser ? "text-amber-400 font-bold" : ""}>{act?.name || "Target"}</span>
                                <span>{Math.floor(threat)}</span>
                              </div>
                            )
                          })
                        }
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-zinc-500 font-medium">
                    No Target Selected
                    <p className="text-[9px] text-zinc-600 mt-1">Click a gladiator or press Tab to lock target</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Battle Log */}
            <Card className="border-zinc-800 bg-zinc-900/70 backdrop-blur shadow-xl h-[280px] flex flex-col overflow-hidden">
              <CardHeader className="pb-1.5 border-b border-zinc-800/60 flex-shrink-0">
                <CardTitle className="text-xs font-extrabold uppercase tracking-widest text-zinc-400">Combat Feed</CardTitle>
              </CardHeader>
              <CardContent className="p-3 flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 selection:bg-amber-500/20">
                {battleLog.length === 0 ? (
                  <p className="text-zinc-600 italic">Listening for actions...</p>
                ) : (
                  battleLog.map((log, i) => (
                    <p 
                      key={i} 
                      className={cn(
                        "leading-relaxed transition-opacity duration-150 border-l pl-1.5 border-zinc-800",
                        i === 0 ? "text-zinc-100 font-bold" : "text-zinc-500"
                      )}
                    >
                      {log}
                    </p>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

        </div>

        {/* Victory Screen */}
        {isVictory && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
            <Card className="border-yellow-500/40 bg-zinc-900 text-center p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg blur opacity-10 animate-pulse" />
              <div className="relative">
                <div className="w-16 h-16 bg-yellow-500/20 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-500/40 shadow-inner">
                  <Sun className="w-8 h-8 animate-spin" />
                </div>
                <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-500 mb-2 tracking-widest uppercase">
                  Victory!
                </h2>
                <p className="text-zinc-400 text-sm mb-6">
                  You and your companions have triumphed and defeated <span className="text-red-400 font-bold">{boss.name}</span>!
                </p>
                <Button onClick={onBack} className="w-full bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-extrabold tracking-wider uppercase transition-colors">
                  Return to Menu
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Defeat Screen */}
        {isDefeat && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
            <Card className="border-red-950 bg-zinc-900 text-center p-8 max-w-md w-full mx-4 shadow-2xl relative overflow-hidden">
              <div className="relative">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-900/40">
                  <Skull className="w-8 h-8" />
                </div>
                <h2 className="text-3xl font-black text-red-600 mb-2 tracking-widest uppercase">
                  Defeated
                </h2>
                <p className="text-zinc-400 text-sm mb-6">
                  The arena claimed your life. Heal your wounds and try again!
                </p>
                <Button onClick={onBack} className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold tracking-wider uppercase transition-colors">
                  Release Spirit
                </Button>
              </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
