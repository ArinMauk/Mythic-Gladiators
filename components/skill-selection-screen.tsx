"use client"

import React, { useState, useEffect } from "react"
import { useGame } from "@/lib/game-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Flame,
  Shield,
  Heart,
  Zap,
  Swords,
  Skull,
  Sun,
  Target,
  Sparkles,
  ArrowLeft,
  Lock,
  Plus,
  Minus,
  Check,
  Award,
  BookOpen
} from "lucide-react"
import { cn } from "@/lib/utils"
import talentsData from "@/lib/combat/data/talents.json"

interface SkillSelectionScreenProps {
  onNext: () => void
  onBack: () => void
}

const specIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  arms: Swords,
  fury: Flame,
  protection: Shield,
  holy: Heart,
  disc: Shield,
  shadow: Skull,
  marksmanship: Target,
  beast_mastery: Sparkles,
  survival: Shield,
  assassination: Skull,
  combat: Swords,
  subtlety: Zap,
  fire: Flame,
  frost: Shield,
  arcane: Sparkles,
  affliction: Skull,
  demonology: Sparkles,
  destruction: Flame,
  retribution: Swords,
  elemental: Zap,
  enhancement: Swords,
  restoration: Heart
}

const specColors: Record<string, string> = {
  arms: "text-amber-500 border-amber-500/30 bg-amber-500/5",
  fury: "text-red-500 border-red-500/30 bg-red-500/5",
  protection: "text-blue-500 border-blue-500/30 bg-blue-500/5",
  holy: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  disc: "text-slate-300 border-slate-300/30 bg-slate-300/5",
  shadow: "text-purple-500 border-purple-500/30 bg-purple-500/5",
  marksmanship: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
  beast_mastery: "text-green-500 border-green-500/30 bg-green-500/5",
  survival: "text-teal-500 border-teal-500/30 bg-teal-500/5",
  assassination: "text-yellow-500 border-yellow-500/30 bg-yellow-500/5",
  combat: "text-orange-500 border-orange-500/30 bg-orange-500/5",
  subtlety: "text-indigo-400 border-indigo-400/30 bg-indigo-400/5",
  fire: "text-red-500 border-red-500/30 bg-red-500/5",
  frost: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  arcane: "text-fuchsia-400 border-arcane-400/30 bg-fuchsia-400/5",
  affliction: "text-purple-400 border-purple-400/30 bg-purple-400/5",
  demonology: "text-violet-500 border-violet-500/30 bg-violet-500/5",
  destruction: "text-orange-600 border-orange-500/30 bg-orange-500/5",
  retribution: "text-amber-500 border-amber-500/30 bg-amber-500/5",
  elemental: "text-cyan-400 border-cyan-400/30 bg-cyan-400/5",
  enhancement: "text-amber-400 border-amber-400/30 bg-amber-400/5",
  restoration: "text-emerald-400 border-emerald-400/30 bg-emerald-400/5"
}

export function SkillSelectionScreen({ onNext, onBack }: SkillSelectionScreenProps) {
  const { selectedClass, selectedTalents, setSelectedTalents } = useGame()
  
  // Find current class spec configuration
  const classKey = selectedClass || "warrior"
  const classConfig = (talentsData as any)[classKey]
  const trees = classConfig?.trees || []

  // Initialize temp points spent array per tree: [ [0, 0, 0], [0, 0, 0], [0, 0, 0] ]
  const [tempTalents, setTempTalents] = useState<number[][]>([
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0]
  ])
  const [pointsRemaining, setPointsRemaining] = useState(3)

  // Hydrate from context on load
  useEffect(() => {
    if (selectedTalents && selectedTalents.length > 0) {
      const initialAllocation = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0]
      ]
      let spent = 0
      trees.forEach((tree: any, treeIdx: number) => {
        tree.talents.forEach((talent: any, talentIdx: number) => {
          if (selectedTalents.includes(talent.id)) {
            initialAllocation[treeIdx][talentIdx] = 1
            spent += 1
          }
        })
      })
      setTempTalents(initialAllocation)
      setPointsRemaining(Math.max(0, 3 - spent))
    }
  }, [selectedTalents, trees])

  const canAllocate = (treeIndex: number, talentIndex: number) => {
    if (pointsRemaining <= 0) return false
    const currentAllocation = tempTalents[treeIndex][talentIndex]
    if (currentAllocation >= 1) return false // Max 1 point
    
    // Prerequisites: Tier 2 requires Tier 1, Tier 3 requires Tier 2
    if (talentIndex > 0) {
      const parentAllocation = tempTalents[treeIndex][talentIndex - 1]
      if (parentAllocation <= 0) return false
    }
    return true
  }

  const canRefund = (treeIndex: number, talentIndex: number) => {
    const currentAllocation = tempTalents[treeIndex][talentIndex]
    if (currentAllocation <= 0) return false
    
    // Dependencies: refunding Tier 1 requires Tier 2 to be 0; refunding Tier 2 requires Tier 3 to be 0
    if (talentIndex < 2) {
      const childAllocation = tempTalents[treeIndex][talentIndex + 1]
      if (childAllocation > 0) return false
    }
    return true
  }

  const handleNodeClick = (treeIndex: number, talentIndex: number) => {
    const currentAllocation = tempTalents[treeIndex][talentIndex]
    if (currentAllocation > 0) {
      if (canRefund(treeIndex, talentIndex)) {
        const nextAlloc = tempTalents.map((row, rIdx) => 
          row.map((val, colIdx) => (rIdx === treeIndex && colIdx === talentIndex ? 0 : val))
        )
        setTempTalents(nextAlloc)
        setPointsRemaining(pointsRemaining + 1)
      }
    } else {
      if (canAllocate(treeIndex, talentIndex)) {
        const nextAlloc = tempTalents.map((row, rIdx) => 
          row.map((val, colIdx) => (rIdx === treeIndex && colIdx === talentIndex ? 1 : val))
        )
        setTempTalents(nextAlloc)
        setPointsRemaining(pointsRemaining - 1)
      }
    }
  }

  const handleConfirm = () => {
    const finalizedTalents: string[] = []
    trees.forEach((tree: any, treeIdx: number) => {
      tree.talents.forEach((talent: any, talentIdx: number) => {
        if (tempTalents[treeIdx][talentIdx] > 0) {
          finalizedTalents.push(talent.id)
        }
      })
    })
    setSelectedTalents(finalizedTalents)
    onNext()
  }

  const handleReset = () => {
    setTempTalents([
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0]
    ])
    setPointsRemaining(3)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[url('/dark-fantasy-castle-battlefield-night-sky.jpg')] bg-cover bg-center select-none">
      <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-5xl space-y-6">
        {/* Header Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Class Selection
        </button>

        {/* Title */}
        <div className="text-center space-y-1.5">
          <h1 className="text-4xl font-extrabold tracking-widest text-foreground uppercase">Class Spec Talents</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Spend up to <span className="text-amber-400 font-bold">3 Talent Points</span> across the specialization trees to customize your abilities.
          </p>
        </div>

        {/* Talent Dashboard */}
        <div className="flex items-center justify-between px-6 py-3 rounded-xl border border-zinc-800 bg-zinc-900/80 shadow-inner">
          <div className="flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-500 animate-bounce" />
            <span className="text-sm text-zinc-400 uppercase tracking-wider font-bold">Points Remaining:</span>
            <span className={cn(
              "text-2xl font-black font-mono transition-colors duration-300",
              pointsRemaining > 0 ? "text-amber-400" : "text-zinc-500"
            )}>
              {pointsRemaining}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={pointsRemaining === 3}
            className="border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-xs py-1"
          >
            Reset Trees
          </Button>
        </div>

        {/* 3 Trees Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trees.map((tree: any, treeIdx: number) => {
            const Icon = specIcons[tree.id] || Swords
            const colorClass = specColors[tree.id] || "text-amber-500 border-amber-500/30 bg-amber-500/5"

            return (
              <Card key={tree.id} className="border-zinc-800/80 bg-zinc-900/60 shadow-xl flex flex-col justify-between overflow-hidden">
                <CardHeader className={cn("p-4 border-b border-zinc-800 flex flex-col items-center text-center", colorClass)}>
                  <div className="w-12 h-12 rounded-xl bg-zinc-950/80 flex items-center justify-center border border-zinc-800 shadow shadow-black">
                    <Icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg font-black uppercase mt-2 tracking-wider text-zinc-100">{tree.name}</CardTitle>
                  <CardDescription className="text-zinc-400 text-xs leading-relaxed mt-1 truncate w-full px-2">
                    {tree.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-4 space-y-6 relative flex-1 flex flex-col items-center justify-center min-h-[300px]">
                  {tree.talents.map((talent: any, talentIdx: number) => {
                    const allocation = tempTalents[treeIdx][talentIdx]
                    const isAllocated = allocation > 0
                    const locked = talentIdx > 0 && tempTalents[treeIdx][talentIdx - 1] === 0
                    const allocatable = canAllocate(treeIdx, talentIdx)
                    const refundable = canRefund(treeIdx, talentIdx)

                    return (
                      <div key={talent.id} className="w-full flex flex-col items-center relative z-10">
                        {/* Connecting Line from previous talent */}
                        {talentIdx > 0 && (
                          <div className={cn(
                            "absolute -top-6 w-0.5 h-6 transition-all duration-300",
                            tempTalents[treeIdx][talentIdx - 1] > 0 ? "bg-amber-500" : "bg-zinc-800"
                          )} />
                        )}

                        {/* Interactive Node Card */}
                        <button
                          onClick={() => handleNodeClick(treeIdx, talentIdx)}
                          className={cn(
                            "w-full p-3 rounded-lg border-2 text-left transition-all duration-300 flex items-center gap-3 relative shadow",
                            isAllocated
                              ? "border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5 text-zinc-100 scale-[1.02]"
                              : locked
                                ? "border-zinc-900 bg-zinc-950/40 text-zinc-600 cursor-not-allowed brightness-[60%]"
                                : allocatable
                                  ? "border-zinc-700 bg-zinc-850 text-zinc-300 hover:border-amber-500/50 hover:bg-zinc-800/80 cursor-pointer"
                                  : "border-zinc-800 bg-zinc-900 text-zinc-400"
                          )}
                          disabled={locked && !refundable}
                        >
                          {/* Left node status indicator */}
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center border font-bold text-sm flex-shrink-0 shadow",
                            isAllocated
                              ? "bg-amber-500 text-zinc-950 border-amber-400 shadow shadow-amber-500/20"
                              : locked
                                ? "bg-zinc-950 text-zinc-700 border-zinc-900"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          )}>
                            {isAllocated ? <Check className="w-4 h-4" /> : locked ? <Lock className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </div>

                          {/* Node text details */}
                          <div className="flex-1 min-w-0 pr-1">
                            <h4 className={cn("text-xs font-black truncate tracking-wide leading-none", isAllocated ? "text-amber-300" : "text-zinc-200")}>
                              {talent.name}
                            </h4>
                            <p className="text-[10px] text-zinc-400 mt-1 leading-normal select-none pr-1">
                              {talent.description}
                            </p>
                          </div>
                          
                          {/* Point indicator on far right */}
                          <div className={cn(
                            "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border leading-none self-start mt-0.5",
                            isAllocated ? "border-amber-400/50 text-amber-400 bg-amber-500/10" : "border-zinc-800 text-zinc-500"
                          )}>
                            {allocation}/{talent.maxPoints}
                          </div>
                        </button>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Bottom Gating Action Buttons */}
        <div className="pt-2">
          <Button
            onClick={handleConfirm}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-extrabold tracking-widest uppercase py-6 text-base shadow-xl transition-all duration-300 active:scale-[0.98] border border-primary/20 flex items-center justify-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Proceed to Level Selection
          </Button>
        </div>
      </div>
    </div>
  )
}
