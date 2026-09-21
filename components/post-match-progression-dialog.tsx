"use client"

import React, { useEffect, useState } from "react"
import { ProgressionRewardResult } from "@/lib/progression/types"
import { ARENA_REWARDS, LevelId } from "@/lib/progression/config"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Trophy,
  Award,
  Coins,
  Sparkles,
  ArrowRight,
  Sun,
  Shield,
  CheckCircle2,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface PostMatchProgressionDialogProps {
  reward: ProgressionRewardResult | null
  arenaId: LevelId
  isQuickplay: boolean
  onContinue: (targetScreen?: string) => void
}

const arenaTitles: Record<LevelId, { name: string; subtitle: string }> = {
  "level-1": {
    name: "Evil Raid Boss",
    subtitle: "Raid Encounter Cleared",
  },
  "level-2": {
    name: "Gladiator Skirmish",
    subtitle: "4v4 Skirmish Triumph",
  },
}

export function PostMatchProgressionDialog({
  reward,
  arenaId,
  isQuickplay,
  onContinue,
}: PostMatchProgressionDialogProps) {
  const [animatedPct, setAnimatedPct] = useState(0)

  useEffect(() => {
    if (reward) {
      // Small delay then animate progress bar
      const timer = setTimeout(() => {
        setAnimatedPct(reward.xpProgressPercentage)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [reward])

  const arenaInfo = arenaTitles[arenaId] || {
    name: "Arena Trial",
    subtitle: "Trial Completed",
  }

  // If in quickplay/sandbox
  if (isQuickplay || !reward) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
        <Card className="border-amber-500/40 bg-zinc-900/95 max-w-md w-full shadow-2xl p-6 text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
            <Sun className="w-8 h-8 animate-spin-slow" />
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
              Sandbox Trial
            </span>
            <h2 className="text-2xl font-black uppercase tracking-wider text-foreground">
              Victory in {arenaInfo.name}!
            </h2>
            <p className="text-xs text-zinc-400">{arenaInfo.subtitle}</p>
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs text-zinc-400">
            <p className="font-semibold text-zinc-300">Quickplay / Sandbox Mode Active</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              No permanent character progression, XP, or gold was saved for this match.
            </p>
          </div>

          <Button
            onClick={() => onContinue("character-selection")}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-wider text-xs py-4"
          >
            Return to Gladiator Menu
          </Button>
        </Card>
      </div>
    )
  }

  const hasLeveledUp = reward.levelsGained > 0

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in">
      <Card className="relative border-amber-500/50 bg-zinc-900/95 max-w-lg w-full shadow-2xl overflow-hidden border-2">
        {/* Glow accent */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-32 bg-amber-500/20 blur-3xl pointer-events-none" />

        <CardContent className="p-6 sm:p-8 space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-amber-500/30 to-amber-600/10 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
              <Trophy className="w-8 h-8 text-amber-400 animate-bounce" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded-full border border-amber-400/20">
                Arena Victorious!
              </span>
              <h2 className="text-3xl font-black uppercase tracking-wider text-foreground mt-1">
                {arenaInfo.name}
              </h2>
              <p className="text-xs text-zinc-400">{arenaInfo.subtitle}</p>
            </div>
          </div>

          {/* Level-Up Banner (if applicable) */}
          {hasLeveledUp && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-2 border-amber-400/60 shadow-lg text-center space-y-1 animate-pulse">
              <div className="flex items-center justify-center gap-1.5 text-amber-400">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-widest">
                  Level Up Achieved!
                </span>
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xl font-black text-foreground">
                Advanced from Level {reward.previousLevel} →{" "}
                <span className="text-amber-400 underline decoration-amber-400">
                  Level {reward.newLevel}
                </span>
              </p>
              {reward.talentPointsEarned > 0 && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-700/60 mt-1">
                  <Award className="w-3.5 h-3.5" />
                  +{reward.talentPointsEarned} Talent Point
                  {reward.talentPointsEarned > 1 ? "s" : ""} Earned!
                </div>
              )}
            </div>
          )}

          {/* Rewards Breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {/* XP Earned Box */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400">
                  Experience
                </span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-amber-400 font-mono">
                  +{reward.xpEarned}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">XP</span>
              </div>
            </div>

            {/* Gold Earned Box */}
            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-zinc-400">
                  Gold Spoils
                </span>
                <Coins className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-yellow-400 font-mono">
                  +{reward.goldEarned}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">Gold</span>
              </div>
            </div>
          </div>

          {/* XP Progress toward next level */}
          <div className="space-y-2 bg-zinc-950/60 p-3.5 rounded-xl border border-zinc-800/80">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-zinc-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" />
                Level {reward.newLevel} Progress
              </span>
              <span className="text-zinc-400 font-mono text-[11px]">
                {reward.isMaxLevel
                  ? "Maximum Level Reached"
                  : `${reward.currentXp} / ${reward.xpForNextLevel} XP (${reward.xpProgressPercentage}%)`}
              </span>
            </div>

            <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-1000 ease-out"
                style={{ width: `${animatedPct}%` }}
              />
            </div>
          </div>

          {/* Updated Overview stats */}
          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 border-t border-zinc-800/80 pt-3">
            <div>
              Total Gold:{" "}
              <span className="text-yellow-400 font-bold font-mono">
                {reward.totalGold}
              </span>
            </div>
            <div>
              Unspent Talent Pts:{" "}
              <span
                className={cn(
                  "font-bold font-mono",
                  reward.unspentTalentPoints > 0
                    ? "text-amber-400"
                    : "text-zinc-400"
                )}
              >
                {reward.unspentTalentPoints}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            {reward.unspentTalentPoints > 0 && (
              <Button
                onClick={() => onContinue("skill-selection")}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black uppercase tracking-wider text-xs py-4 shadow-lg shadow-amber-500/20"
              >
                <Award className="w-4 h-4 mr-1.5" />
                Spend Talent Points ({reward.unspentTalentPoints})
              </Button>
            )}

            <Button
              onClick={() => onContinue("character-selection")}
              variant={reward.unspentTalentPoints > 0 ? "outline" : "default"}
              className={cn(
                "flex-1 font-black uppercase tracking-wider text-xs py-4",
                reward.unspentTalentPoints > 0
                  ? "border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              )}
            >
              Continue to Roster
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
