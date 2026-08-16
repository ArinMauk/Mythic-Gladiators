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
  Users,
  LucideProps
} from "lucide-react"
import { cn } from "@/lib/utils"
import * as THREE from "three"
import { CombatSimulation } from "@/lib/combat/simulation"
import { Actor } from "@/lib/combat/actor"
import { getClassAbilities, Ability, applyTalentsToActor } from "@/lib/combat/ability"
import ArenaCanvasContainer from "./arena-3d-canvas"
import { ArenaErrorBoundary } from "./arena-error-boundary"
import { MultiplayerManager } from "@/lib/multiplayer-manager"
import { Copy, Check, Sliders, Wand2 } from "lucide-react"

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
  const {
    username,
    selectedClass,
    companionType,
    gameMode,
    selectedLevel,
    setSelectedLevel,
    selectedTalents,
    isMultiplayer,
    isHost,
    roomId,
    cheats,
    updateCheat
  } = useGame()
  
  const [matchStarted, setMatchStarted] = useState(!isMultiplayer)
  const [lobbyPlayers, setLobbyPlayers] = useState<any[]>([
    { peerId: isHost ? "host" : "client", username, class: selectedClass || "warrior", isHost }
  ])
  const simRef = useRef<CombatSimulation | null>(null)

  const handleLevelChange = (level: "level-1" | "level-2") => {
    setSelectedLevel(level)
  }

  const handleStartMatch = (level: "level-1" | "level-2") => {
    console.log("=== [Lobby] Launching Battle Simulation ===", { level });
    setSelectedLevel(level);

    // Create the final clean CombatSimulation with the chosen level
    const sim = new CombatSimulation(username, selectedClass || "warrior", level);
    applyTalentsToActor(sim.playerActor, selectedTalents);

    // Populate actual co-op players from lobbyPlayers roster
    lobbyPlayers.forEach((lp) => {
      // Avoid adding the client's local user (which is already simulation.playerActor / 'user')
      const isLpLocalUser = lp.peerId === "client" || (lp.isHost && isHost) || (lp.peerId !== "host" && multiplayerRef.current?.peer?.id === lp.peerId);
      
      if (!isLpLocalUser) {
        // Remove an AI companion to keep party size balanced
        if (level === "level-2" || sim.actors.length > 2) {
          const aiCompanions = sim.actors.filter((a) => a.faction === "player" && !a.isUser);
          if (aiCompanions.length > 0) {
            sim.actors = sim.actors.filter((a) => a.id !== aiCompanions[0].id);
          }
        }

        const id = lp.isHost ? "host_player" : lp.peerId;
        const role = lp.class === "priest" ? "healer" : "damage";
        
        // Spawn them slightly offset
        const spawnPos = new THREE.Vector3(lp.isHost ? -8 : 8, 0, lp.isHost ? -8 : 8);

        const peerActor = new Actor(
          id,
          lp.username,
          lp.class,
          "player", // same player faction
          role,
          spawnPos,
          false
        );
        sim.actors.push(peerActor);
        console.log(`=== [Lobby] Spawning connected gladiator actor: ${lp.username} as ${id} ===`);
      }
    });

    simRef.current = sim;
    if (multiplayerRef.current) {
      multiplayerRef.current.simulation = sim;
    }

    setMatchStarted(true);
  }

  // 1. Initialize the 3D Combat Simulation Engine (persists in ref)
  if (!simRef.current) {
    console.log("=== [GameArenaScreen] Instantiating CombatSimulation ===", { username, selectedClass, selectedLevel });
    try {
      const sim = new CombatSimulation(username, selectedClass || "warrior", selectedLevel || "level-1")
      console.log("=== [GameArenaScreen] Applying talents to player actor ===", selectedTalents);
      applyTalentsToActor(sim.playerActor, selectedTalents)
      simRef.current = sim
      console.log("=== [GameArenaScreen] CombatSimulation Initialized Successfully! ===", {
        actors: sim.actors.map(a => ({ id: a.id, name: a.name, faction: a.faction, class: a.class })),
        obstacles: sim.obstacles.length
      });
    } catch (err) {
      console.error("=== [GameArenaScreen] CRITICAL ERROR IN COMBAT SIMULATION CONSTRUCTOR ===", err);
      throw err;
    }
  }
  const simulation = simRef.current

  useEffect(() => {
    console.log("=== [GameArenaScreen] Mounted ===")
    return () => {
      console.log("=== [GameArenaScreen] Unmounted ===")
    }
  }, [])

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

  // Cheats / Lobby Toggles
  const [networkStatus, setNetworkStatus] = useState<string>("Offline Stand-alone")
  const [showCheats, setShowCheats] = useState(false)
  const [showLobby, setShowLobby] = useState(false)
  const [copied, setCopied] = useState(false)
  const [PeerClass, setPeerClass] = useState<any>(null)

  const multiplayerRef = useRef<MultiplayerManager | null>(null)

  // Load PeerJS dynamically from unpkg CDN on browser mount to completely bypass Next.js SSR/Bundler quirks
  useEffect(() => {
    if (isMultiplayer && typeof window !== "undefined") {
      const win = window as any
      if (win.Peer) {
        setPeerClass(() => win.Peer)
        return
      }

      const script = document.createElement("script")
      script.src = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"
      script.async = true
      script.onload = () => {
        if (win.Peer) {
          setPeerClass(() => win.Peer)
        } else {
          console.error("PeerJS script loaded but window.Peer is undefined")
          setNetworkStatus("P2P engine error.")
        }
      }
      script.onerror = (err) => {
        console.error("Failed to load PeerJS CDN script:", err)
        setNetworkStatus("Network P2P engine failed.")
      }
      document.head.appendChild(script)
    }
  }, [isMultiplayer])

  // Keep address bar URL in sync with roomId for easy address bar copying
  useEffect(() => {
    if (isMultiplayer && roomId && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      if (params.get("room") !== roomId) {
        window.history.replaceState(null, "", `?room=${roomId}`)
      }
    }
  }, [isMultiplayer, roomId])

  // Synchronize cheats values with the local simulation character on change
  useEffect(() => {
    if (player) {
      player.isGodMode = cheats.godMode
      player.isNoCooldowns = cheats.noCooldowns
      player.isInstantCast = cheats.instantCast
      player.cheatSpeedMultiplier = cheats.speedMultiplier
      player.damageMultiplier = cheats.damageMultiplier
      player.healingMultiplier = cheats.healingMultiplier
      player.setCheatLevel(cheats.level)
      player.gold = cheats.gold
    }
  }, [cheats, player])

  // Initialize WebRTC P2P Multiplayer Manager if enabled
  useEffect(() => {
    if (!isMultiplayer || !PeerClass) return

    const manager = new MultiplayerManager(
      simulation,
      isHost,
      roomId,
      username,
      selectedClass || "warrior",
      selectedTalents,
      cheats,
      PeerClass,
      (status: string) => setNetworkStatus(status)
    )

    manager.onLevelChange = (level) => {
      console.log("=== [Lobby] Client received level change: " + level + " ===");
      handleLevelChange(level);
    };

    manager.onStartMatch = (level) => {
      console.log("=== [Lobby] Client received start match signal for: " + level + " ===");
      handleStartMatch(level);
    };

    manager.onLobbyPlayersUpdate = (players) => {
      console.log("=== [Lobby] Players updated: ===", players);
      setLobbyPlayers(players);
    };

    multiplayerRef.current = manager

    // High frequency state tick
    const syncInterval = setInterval(() => {
      manager.sendTickUpdate()
    }, 50) // 20Hz

    return () => {
      clearInterval(syncInterval)
      manager.destroy()
      multiplayerRef.current = null
    }
  }, [isMultiplayer, isHost, roomId, username, selectedClass, selectedTalents, PeerClass])

  // Synchronize dynamic CombatSimulation reference to WebRTC manager
  useEffect(() => {
    if (multiplayerRef.current) {
      multiplayerRef.current.simulation = simulation
      
      // Also bind the visual effect callbacks on Host
      if (isHost) {
        simulation.onVisualEffectSpawn = (type, pos, target, color, size, duration) => {
          multiplayerRef.current?.broadcastVisualEffect(type, pos, color, size, duration)
        }
        simulation.onFloatingTextSpawn = (text, pos, color, isCrit) => {
          multiplayerRef.current?.broadcastFloatingText(text, pos, color, isCrit)
        }
      }
    }
  }, [simulation, isHost])

  // Update multiplayer cheats on change
  useEffect(() => {
    if (multiplayerRef.current) {
      multiplayerRef.current.updateLocalCheats(cheats)
    }
  }, [cheats])

  // Abilities lists
  const playerAbilities = getClassAbilities(player.class, selectedTalents)

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

  // Keybinding Listeners (1, 2, and 3 keys for Abilities)
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (e.key === "1" && playerAbilities[0]) {
        e.preventDefault()
        castAbility(playerAbilities[0])
      } else if (e.key === "2" && playerAbilities[1]) {
        e.preventDefault()
        castAbility(playerAbilities[1])
      } else if (e.key === "3" && playerAbilities[2]) {
        e.preventDefault()
        castAbility(playerAbilities[2])
      }
    }

    window.addEventListener("keydown", handleKeys)
    return () => {
      window.removeEventListener("keydown", handleKeys)
    }
  }, [playerAbilities, selectedTarget])

  // Combat status indicators
  const isVictory = selectedLevel === "level-2"
    ? party.length > 0 && simulation.actors.filter(a => a.faction === "enemy").every(a => a.health <= 0)
    : bossHp <= 0

  const isDefeat = playerHp <= 0

  const castAbility = (ability: Ability) => {
    if (!ability) return
    if (player.health <= 0 || isVictory) return
    
    // Attempt casting on currently selected target
    ability.startCast(player, player.target, simulation)

    if (isMultiplayer && !isHost && multiplayerRef.current) {
      multiplayerRef.current.broadcastClientCast(ability.id, player.target ? player.target.id : null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 font-sans text-zinc-200 selection:bg-amber-500/30 selection:text-white">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60 shadow-inner">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors text-sm font-semibold group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Leave Battle
          </button>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {isMultiplayer && (
              <button
                onClick={() => {
                  setShowLobby(!showLobby)
                  setShowCheats(false)
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black tracking-wide uppercase transition-all duration-300 border flex items-center gap-1.5 shadow-md",
                  showLobby
                    ? "bg-cyan-500 text-zinc-950 border-cyan-400 shadow-cyan-500/20"
                    : "bg-cyan-950/40 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/10"
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Lobby {isHost ? `(Host: ${roomId})` : "(Client)"}
              </button>
            )}

            <button
              onClick={() => {
                setShowCheats(!showCheats)
                setShowLobby(false)
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black tracking-wide uppercase transition-all duration-300 border flex items-center gap-1.5 shadow-md",
                showCheats
                  ? "bg-green-500 text-zinc-950 border-green-400 shadow-green-500/20"
                  : "bg-green-950/40 text-green-400 border-green-500/20 hover:bg-green-500/10"
              )}
            >
              <Sliders className="w-3.5 h-3.5 animate-pulse" />
              Sandbox Cheats
            </button>

            <div className="bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-400 font-medium">
              Mode: <span className="text-zinc-200 font-bold">{gameMode?.toUpperCase() || "PVE"}</span> | Companion: <span className="text-zinc-200 font-bold">{companionType?.toUpperCase() || "AI"}</span>
            </div>
          </div>
        </div>

        {/* LOBBY MODAL PANEL */}
        {isMultiplayer && showLobby && (
          <Card className="border-cyan-800/80 bg-zinc-900/95 backdrop-blur p-4 rounded-xl shadow-2xl relative animate-fade-in border-2">
            <h3 className="text-lg font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Gladiator Co-Op Room
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Invite friends to play together browser-to-browser instantly using WebRTC!</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/40">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Invite Link</span>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}?room=${roomId}` : ""}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-zinc-300 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-3.5 py-1.5 rounded font-black text-xs uppercase flex items-center gap-1 transition-all"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 leading-normal">
                  <span className="text-cyan-400 font-bold">How to join:</span> Copy the link above and send it to your friend. When they open it, they can immediately pick their class and spawn directly in your arena!
                </div>
              </div>

              <div className="space-y-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/40">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">P2P Network Status</span>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                  </span>
                  <span className="text-xs font-mono font-bold text-zinc-200">{networkStatus}</span>
                </div>
                <div className="text-[10px] text-zinc-500 leading-normal">
                  Role: <span className="font-bold text-zinc-300">{isHost ? "Raid Host" : "Client Gladiator"}</span>
                  <p className="mt-1">Since we use client authority, if you or your friend enable hacks, they will immediately be synced to both clients with zero server restrictions.</p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* SANDBOX CHEATS MODAL PANEL */}
        {showCheats && (
          <Card className="border-green-800 bg-zinc-900/95 backdrop-blur p-4 rounded-xl shadow-2xl relative animate-fade-in border-2">
            <h3 className="text-lg font-black text-green-400 uppercase tracking-widest mb-1 flex items-center gap-2">
              <Sliders className="w-5 h-5" />
              Sandbox Hack Panel
            </h3>
            <p className="text-xs text-zinc-400 mb-4">Tweak your client stats on the fly! Updates your character and broadcasts hacks to the peer instantly.</p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              
              {/* Toggles */}
              <div className="space-y-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40 flex flex-col justify-center">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block mb-1">Status Cheats</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">God Mode (Invincible)</span>
                  <input
                    type="checkbox"
                    checked={cheats.godMode}
                    onChange={(e) => updateCheat("godMode", e.target.checked)}
                    className="accent-green-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">No Cooldowns / No GCD</span>
                  <input
                    type="checkbox"
                    checked={cheats.noCooldowns}
                    onChange={(e) => updateCheat("noCooldowns", e.target.checked)}
                    className="accent-green-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300">Instant Spells</span>
                  <input
                    type="checkbox"
                    checked={cheats.instantCast}
                    onChange={(e) => updateCheat("instantCast", e.target.checked)}
                    className="accent-green-500 h-4 w-4 rounded cursor-pointer"
                  />
                </div>
              </div>

              {/* Sliders 1 */}
              <div className="space-y-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block mb-1">Level & Wealth</span>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 font-bold mb-1">
                    <span>Gladiator Level</span>
                    <span className="text-green-400">{cheats.level}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={cheats.level}
                    onChange={(e) => updateCheat("level", parseInt(e.target.value))}
                    className="w-full accent-green-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 font-bold mb-1">
                    <span>Gold Counter</span>
                    <span className="text-yellow-400">{cheats.gold.toLocaleString()}g</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateCheat("gold", cheats.gold + 1000)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] px-2 py-1 rounded font-bold"
                    >
                      +1k
                    </button>
                    <button
                      onClick={() => updateCheat("gold", cheats.gold + 50000)}
                      className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] px-2 py-1 rounded font-bold"
                    >
                      +50k
                    </button>
                    <button
                      onClick={() => updateCheat("gold", 100)}
                      className="bg-red-950/50 hover:bg-red-900/50 text-red-300 text-[10px] px-2 py-1 rounded font-bold"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              {/* Sliders 2 */}
              <div className="space-y-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block mb-1">Movement Cheats</span>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 font-bold mb-1">
                    <span>Movement Speed</span>
                    <span className="text-green-400">{cheats.speedMultiplier.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={cheats.speedMultiplier}
                    onChange={(e) => updateCheat("speedMultiplier", parseFloat(e.target.value))}
                    className="w-full accent-green-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>
                <div className="text-[9px] text-zinc-500 leading-normal">
                  Enjoy flying across the map and easily line-of-sight targets around pillars at 5x movement speed.
                </div>
              </div>

              {/* Sliders 3 */}
              <div className="space-y-3 bg-zinc-950/40 p-3 rounded-lg border border-zinc-800/40">
                <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block mb-1">Damage Cheats</span>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 font-bold mb-1">
                    <span>Damage Out</span>
                    <span className="text-green-400">{cheats.damageMultiplier}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="5"
                    value={cheats.damageMultiplier}
                    onChange={(e) => updateCheat("damageMultiplier", parseInt(e.target.value))}
                    className="w-full accent-green-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-xs text-zinc-300 font-bold mb-1">
                    <span>Healing Out</span>
                    <span className="text-green-400">{cheats.healingMultiplier}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="5"
                    value={cheats.healingMultiplier}
                    onChange={(e) => updateCheat("healingMultiplier", parseInt(e.target.value))}
                    className="w-full accent-green-500 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none"
                  />
                </div>
              </div>

            </div>
          </Card>
        )}

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
            
            {/* Highly Visible Match Lobby Invite Banner */}
            {isMultiplayer && isHost && (
              <Card className="border-cyan-500/30 bg-zinc-900/80 p-3 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow shadow-cyan-500/10">
                <div className="flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                  </span>
                  <p className="text-xs text-cyan-400 font-black tracking-wide uppercase">
                    Lobby Code Active! Share with a friend:
                  </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto items-center">
                  <input
                    type="text"
                    readOnly
                    value={typeof window !== "undefined" ? `${window.location.origin}?room=${roomId}` : ""}
                    className="flex-1 sm:w-60 bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }
                    }}
                    className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-3.5 py-1.5 rounded font-black text-xs uppercase flex items-center gap-1 transition-all shrink-0"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy Link"}
                  </button>
                </div>
              </Card>
            )}

            {/* 3D Game Scene / Waiting Lobby */}
            {isMultiplayer && !matchStarted ? (
              <div className="w-full h-[550px] bg-zinc-900 border border-zinc-800/80 rounded-lg p-6 flex flex-col justify-between relative shadow-2xl overflow-hidden select-none">
                <div className="absolute top-0 right-0 bg-cyan-500/10 text-cyan-400 border-l border-b border-cyan-500/20 px-3 py-1 text-[10px] font-black tracking-widest uppercase">
                  P2P Matchmaking Lobby
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Users className="w-5 h-5 animate-pulse" />
                      Gladiator Co-Op Room
                    </h3>
                    <p className="text-xs text-zinc-400">Invite friends using the code or link below. When they join, they'll appear in the party list.</p>
                  </div>

                  {/* Connection Code Display */}
                  <div className="bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-bold text-zinc-400">Room Code:</span>
                      <span className="font-mono text-cyan-300 font-bold bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{roomId}</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto items-center">
                      <input
                        type="text"
                        readOnly
                        value={typeof window !== "undefined" ? `${window.location.origin}?room=${roomId}` : ""}
                        className="flex-1 sm:w-60 bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-300 font-mono"
                      />
                      <button
                        onClick={() => {
                          if (typeof window !== "undefined") {
                            navigator.clipboard.writeText(`${window.location.origin}?room=${roomId}`)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }
                        }}
                        className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-3 py-1 rounded font-black text-xs uppercase flex items-center gap-1 transition-all shrink-0 cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? "Copied" : "Copy Link"}
                      </button>
                    </div>
                  </div>

                  {/* Connected Gladiators List */}
                  <div className="space-y-2">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Connected Gladiators ({lobbyPlayers.length})</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {lobbyPlayers.map((act) => {
                        const Icon = classIcons[act.class] || Shield
                        return (
                          <div key={act.peerId} className="flex items-center gap-2 bg-zinc-950/40 border border-zinc-800/60 rounded px-3 py-2">
                            <Icon className={cn("w-4 h-4", classColors[act.class] || "text-zinc-400")} />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-200 truncate">{act.username}</p>
                              <p className="text-[9px] text-zinc-500 uppercase font-medium">{act.class}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Level Selection Section */}
                  <div className="border-t border-zinc-800/60 pt-4 space-y-3">
                    <span className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-wider block">Encounter Target Level</span>
                    {isHost ? (
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            handleLevelChange("level-1");
                            if (multiplayerRef.current) {
                              multiplayerRef.current.broadcastLevelChange("level-1");
                            }
                          }}
                          className={cn(
                            "flex-1 p-3 rounded-lg border-2 text-left transition-all cursor-pointer",
                            selectedLevel === "level-1"
                              ? "bg-amber-500/10 border-amber-500/60 text-amber-400"
                              : "bg-zinc-950/20 border-zinc-800 hover:bg-zinc-950/40"
                          )}
                        >
                          <p className="text-xs font-black uppercase">Level 1: Evil Raid Boss</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">Classic PVE boss raid trial with destructive fires.</p>
                        </button>
                        <button
                          onClick={() => {
                            handleLevelChange("level-2");
                            if (multiplayerRef.current) {
                              multiplayerRef.current.broadcastLevelChange("level-2");
                            }
                          }}
                          className={cn(
                            "flex-1 p-3 rounded-lg border-2 text-left transition-all cursor-pointer",
                            selectedLevel === "level-2"
                              ? "bg-red-500/10 border-red-500/60 text-red-400"
                              : "bg-zinc-950/20 border-zinc-800 hover:bg-zinc-950/40"
                          )}
                        >
                          <p className="text-xs font-black uppercase">Level 2: Gladiator Skirmish</p>
                          <p className="text-[9px] text-zinc-400 mt-0.5">Tactical team fight trial against enemy gladiator AI.</p>
                        </button>
                      </div>
                    ) : (
                      <div className="bg-zinc-950/50 border border-zinc-800 p-3 rounded-lg text-xs text-zinc-300">
                        Host is selecting... Currently: <span className="font-bold text-cyan-300 uppercase">{selectedLevel === "level-1" ? "Level 1: Evil Raid Boss" : "Level 2: Gladiator Skirmish"}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Matchmaking status / Launcher */}
                <div className="border-t border-zinc-800/60 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    <span className="text-xs font-mono text-zinc-400 font-bold">{networkStatus}</span>
                  </div>

                  {isHost ? (
                    <button
                      onClick={() => {
                        handleStartMatch(selectedLevel);
                        if (multiplayerRef.current) {
                          multiplayerRef.current.broadcastStartMatch(selectedLevel);
                        }
                      }}
                      className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-black tracking-widest uppercase rounded shadow-lg shadow-cyan-500/20 cursor-pointer"
                    >
                      Launch Gladiator Arena
                    </button>
                  ) : (
                    <span className="text-xs font-black tracking-widest uppercase text-cyan-400 animate-pulse">
                      Waiting for Host to Launch...
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <ArenaErrorBoundary>
                <ArenaCanvasContainer 
                  simulation={simulation} 
                  onSelectTarget={(actor) => setSelectedTarget(actor)} 
                />
              </ArenaErrorBoundary>
            )}

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
                        disabled={player.health <= 0 || isVictory}
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
                  {selectedLevel === "level-2" ? (
                    <span>You and your companions have triumphed and defeated the enemy gladiators!</span>
                  ) : (
                    <span>You and your companions have triumphed and defeated <span className="text-red-400 font-bold">{boss.name}</span>!</span>
                  )}
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
