"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Swords, Shield, Heart, Crosshair, BadgeX as Dagger, Flame, Skull, Sun, Sparkles, Users, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoginScreenProps {
  onNext: (target?: any) => void
  onSignup: () => void
}

const classesList = [
  { id: "warrior", name: "Warrior", icon: Shield, color: "text-amber-500", border: "border-amber-500/30", bg: "hover:bg-amber-500/10" },
  { id: "priest", name: "Priest", icon: Heart, color: "text-emerald-400", border: "border-emerald-400/30", bg: "hover:bg-emerald-400/10" },
  { id: "hunter", name: "Hunter", icon: Crosshair, color: "text-green-500", border: "border-green-500/30", bg: "hover:bg-green-500/10" },
  { id: "rogue", name: "Rogue", icon: Dagger, color: "text-yellow-400", border: "border-yellow-400/30", bg: "hover:bg-yellow-400/10" },
  { id: "mage", name: "Mage", icon: Flame, color: "text-blue-400", border: "border-blue-400/30", bg: "hover:bg-blue-400/10" },
  { id: "warlock", name: "Warlock", icon: Skull, color: "text-purple-500", border: "border-purple-500/30", bg: "hover:bg-purple-500/10" },
  { id: "paladin", name: "Paladin", icon: Sun, color: "text-yellow-300", border: "border-yellow-300/30", bg: "hover:bg-yellow-300/10" },
  { id: "shaman", name: "Shaman", icon: Sparkles, color: "text-cyan-400", border: "border-cyan-400/30", bg: "hover:bg-cyan-400/10" },
]

export function LoginScreen({ onNext, onSignup }: LoginScreenProps) {
  const {
    username, setUsername,
    selectedClass, setSelectedClass,
    gameMode, setGameMode,
    isMultiplayer, setIsMultiplayer,
    isHost, setIsHost,
    roomId, setRoomId,
    setCompanionType
  } = useGame()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")

  // Quick Play State
  const [quickName, setQuickName] = useState("")
  const [quickClass, setQuickClass] = useState<string>("warrior")
  const [quickMode, setQuickMode] = useState<"pve" | "pvp">("pve")
  const [quickError, setQuickError] = useState("")

  // Check if joining is active (from url parameter set by game-flow)
  const isJoining = isMultiplayer && !isHost && roomId !== ""

  useEffect(() => {
    // If joining, sync state to UI
    if (isJoining && !selectedClass) {
      setSelectedClass("warrior")
    }
  }, [isJoining])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setLoginError("Please enter your email or username")
      return
    }
    if (!password.trim()) {
      setLoginError("Please enter your password")
      return
    }
    setIsMultiplayer(false)
    setIsHost(false)
    setRoomId("")
    setUsername(email.split("@")[0])
    onNext() // goes to game-type (default pathway)
  }

  const handleQuickPlay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickName.trim()) {
      setQuickError("Please enter a gladiator name")
      return
    }

    // Set context values for host-created frictionless P2P game
    setUsername(quickName.trim())
    setSelectedClass(quickClass as any)
    setIsMultiplayer(true)
    setIsHost(true)
    setCompanionType("players")
    setGameMode(quickMode)

    // Generate custom Room ID (e.g., MG-XXXX)
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    setRoomId(randomCode)

    // Jump straight to Skill Spec tree selection!
    onNext("skill-selection")
  }

  const handleJoinPlay = (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickName.trim()) {
      setQuickError("Please enter a gladiator name")
      return
    }

    setUsername(quickName.trim())
    // selectedClass and roomId are already initialized in GameFlow / useEffect
    onNext("skill-selection")
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/dark-fantasy-castle-battlefield-night-sky.jpg')] bg-cover bg-center overflow-y-auto">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-4xl space-y-6 py-6">
        <div className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center shadow-lg border border-primary/30">
            <Swords className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-wider text-foreground uppercase">Mythic Gladiators</h1>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">Skip the grind, hack your stats, invite a friend, and clash instantly in a 3D WoW-style sandbox arena.</p>
        </div>

        {isJoining ? (
          /* JOIN ROOM VIEW */
          <Card className="w-full max-w-xl mx-auto border-primary/30 bg-card/95 backdrop-blur shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-primary">
                Multiplayer Invitation!
              </CardTitle>
              <CardDescription className="text-zinc-400">
                You've been invited to join Room: <span className="font-mono text-foreground font-black bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">{roomId}</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleJoinPlay} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="join-name" className="text-foreground font-bold">
                    Choose Your Gladiator Name
                  </Label>
                  <Input
                    id="join-name"
                    type="text"
                    placeholder="Enter name..."
                    value={quickName}
                    onChange={(e) => {
                      setQuickName(e.target.value)
                      setQuickError("")
                    }}
                    maxLength={14}
                    className="bg-zinc-900 border-zinc-800 focus:border-primary text-foreground font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground font-bold">Choose Your Class</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {classesList.map((cls) => {
                      const Icon = cls.icon
                      const isSel = selectedClass === cls.id
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => setSelectedClass(cls.id as any)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all duration-200",
                            cls.bg,
                            isSel
                              ? "border-primary bg-primary/10 text-foreground scale-105 shadow-md shadow-primary/10"
                              : "border-zinc-800/80 bg-zinc-900/60 text-zinc-400"
                          )}
                        >
                          <Icon className={cn("w-5 h-5 mb-1", isSel ? cls.color : "text-zinc-500")} />
                          <span className="text-xs font-bold">{cls.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {quickError && <p className="text-destructive text-sm text-center font-semibold">{quickError}</p>}

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-extrabold tracking-wider uppercase text-sm py-5 shadow-lg shadow-primary/20"
                >
                  Join Match & Customize Specs
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* STANDARD VIEW (LOGIN & FRICTIONLESS SPLIT) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            {/* LEFT SIDE: Frictionless Quick Play (Main Focus) */}
            <Card className="md:col-span-7 border-primary/30 bg-card/95 backdrop-blur shadow-2xl flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Instant Sandbox Lobby
                  </CardTitle>
                  <CardDescription className="text-zinc-400">
                    No account required. Instantly host a P2P Room to invite friends!
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <form onSubmit={handleQuickPlay} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="quick-name" className="text-zinc-300 text-xs font-bold">
                        Gladiator Name
                      </Label>
                      <Input
                        id="quick-name"
                        type="text"
                        placeholder="e.g. Thrall"
                        value={quickName}
                        onChange={(e) => {
                          setQuickName(e.target.value)
                          setQuickError("")
                        }}
                        maxLength={14}
                        className="bg-zinc-900 border-zinc-800 focus:border-primary font-semibold text-zinc-100"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs font-bold">Select Class</Label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {classesList.map((cls) => {
                          const Icon = cls.icon
                          const isSel = quickClass === cls.id
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => {
                                setQuickClass(cls.id)
                                setQuickError("")
                              }}
                              className={cn(
                                "flex flex-col items-center justify-center py-2.5 rounded-lg border transition-all duration-200",
                                cls.bg,
                                isSel
                                  ? "border-primary bg-primary/10 text-foreground scale-105"
                                  : "border-zinc-800/80 bg-zinc-900/40 text-zinc-500"
                              )}
                            >
                              <Icon className={cn("w-4 h-4 mb-1", isSel ? cls.color : "text-zinc-500")} />
                              <span className="text-[10px] font-bold">{cls.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs font-bold">Match Mode</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setQuickMode("pve")}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left",
                            quickMode === "pve"
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-zinc-800/80 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700"
                          )}
                        >
                          <Users className={cn("w-4 h-4", quickMode === "pve" ? "text-primary" : "")} />
                          <div>
                            <p className="text-xs font-extrabold leading-none">Co-Op PvE</p>
                            <p className="text-[9px] text-zinc-500 mt-1">Slay AI Bosses with friends</p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQuickMode("pvp")}
                          className={cn(
                            "flex items-center gap-2.5 p-3 rounded-lg border transition-all text-left",
                            quickMode === "pvp"
                              ? "border-primary bg-primary/5 text-foreground"
                              : "border-zinc-800/80 bg-zinc-900/30 text-zinc-500 hover:border-zinc-700"
                          )}
                        >
                          <Swords className={cn("w-4 h-4", quickMode === "pvp" ? "text-primary" : "")} />
                          <div>
                            <p className="text-xs font-extrabold leading-none">1v1 PvP Duel</p>
                            <p className="text-[9px] text-zinc-500 mt-1">Fight head-to-head instantly</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {quickError && <p className="text-destructive text-xs text-center font-semibold">{quickError}</p>}

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-wider uppercase text-xs py-4 flex items-center justify-center gap-1.5 mt-2 shadow-lg shadow-primary/10"
                    >
                      Host Match & Choose Talents
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                </CardContent>
              </div>
            </Card>

            {/* RIGHT SIDE: Account Login (For Saved Progress) */}
            <Card className="md:col-span-5 border-zinc-800 bg-card/60 backdrop-blur shadow-2xl flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-zinc-300">Gladiator Account</CardTitle>
                  <CardDescription className="text-zinc-500 text-xs">
                    Sign in to track progress, customized builds, or play solo.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <div className="space-y-1">
                      <Label htmlFor="email" className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                        Username or Email
                      </Label>
                      <Input
                        id="email"
                        type="text"
                        placeholder="warrior@mythic.gg"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          setLoginError("")
                        }}
                        className="bg-zinc-900/80 border-zinc-800 focus:border-zinc-700 h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-zinc-400 text-[10px] uppercase tracking-wider font-bold">
                        Password
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          setLoginError("")
                        }}
                        className="bg-zinc-900/80 border-zinc-800 focus:border-zinc-700 h-9 text-xs"
                      />
                    </div>

                    {loginError && <p className="text-destructive text-xs text-center font-semibold">{loginError}</p>}

                    <Button
                      type="submit"
                      variant="secondary"
                      className="w-full text-xs font-bold tracking-wider uppercase py-3 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                    >
                      Sign In & Play Solo
                    </Button>

                    <p className="text-center text-[11px] text-zinc-500">
                      New gladiator?{" "}
                      <button type="button" onClick={onSignup} className="text-primary hover:underline font-bold">
                        Create Account
                      </button>
                    </p>
                  </form>
                </CardContent>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
