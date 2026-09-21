"use client"

import React, { useState, useEffect } from "react"
import { useGame } from "@/lib/game-context"
import { CharacterModel } from "@/lib/progression/types"
import { EnrichedShopConfig, EnrichedShopItem } from "@/lib/items/shop-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Coins,
  Store,
  X,
  Check,
  Sword,
  Shield,
  Sparkles,
  ShoppingBag,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ShopModalProps {
  character: CharacterModel
  isOpen: boolean
  onClose: () => void
}

const rarityStyles: Record<string, { text: string; bg: string; border: string }> = {
  common: { text: "text-zinc-300", bg: "bg-zinc-900", border: "border-zinc-700" },
  uncommon: { text: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-600/50" },
  rare: { text: "text-blue-400", bg: "bg-blue-950/20", border: "border-blue-600/50" },
  epic: { text: "text-purple-400", bg: "bg-purple-950/20", border: "border-purple-600/50" },
  legendary: { text: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-500/50" },
}

export function ShopModal({ character, isOpen, onClose }: ShopModalProps) {
  const { refreshCharacters } = useGame()
  const [shop, setShop] = useState<EnrichedShopConfig | null>(null)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (isOpen) {
      const fetchShop = async () => {
        try {
          const res = await fetch("/api/shop")
          if (res.ok) {
            const data = await res.json()
            if (data.shops && data.shops.length > 0) {
              setShop(data.shops[0])
            }
          }
        } catch (err) {
          console.error("Failed to load shop:", err)
        }
      }
      fetchShop()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handlePurchase = async (item: EnrichedShopItem) => {
    setPurchasingId(item.itemId)
    setFeedback(null)

    try {
      const res = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterId: character.id,
          shopId: shop?.id || "gladiator_armory",
          itemId: item.itemId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setFeedback({ type: "error", message: data.error || "Purchase failed" })
        return
      }

      setFeedback({
        type: "success",
        message: `Purchased "${item.definition?.name || item.itemId}" for ${item.price} Gold!`,
      })
      await refreshCharacters()
    } catch (err) {
      setFeedback({ type: "error", message: "Network error during purchase" })
    } finally {
      setPurchasingId(null)
    }
  }

  const formatStats = (stats: any) => {
    return [
      stats?.armor ? `+${stats.armor} Armor` : null,
      stats?.maxHealth ? `+${stats.maxHealth} HP` : null,
      stats?.damageMultiplier ? `+${Math.round(stats.damageMultiplier * 100)}% Dmg` : null,
      stats?.healingMultiplier ? `+${Math.round(stats.healingMultiplier * 100)}% Heal` : null,
      stats?.spellCrit ? `+${Math.round(stats.spellCrit * 100)}% Crit` : null,
      stats?.speed ? `+${stats.speed} Speed` : null,
    ].filter(Boolean).join(" • ")
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto animate-in fade-in">
      <Card className="relative border-yellow-500/40 bg-zinc-950/95 max-w-4xl w-full shadow-2xl overflow-hidden border-2 flex flex-col my-auto max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-foreground">
                {shop?.name || "Gladiator's Armory"}
              </h2>
              <p className="text-xs text-zinc-400">
                Spend arena gold spoils on weapons, armor, and gear.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-zinc-400 font-bold">Gold:</span>
              <span className="text-sm font-black text-yellow-400 font-mono">
                {character.gold}
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={cn(
              "px-4 py-2 text-xs font-bold text-center border-b",
              feedback.type === "success"
                ? "bg-emerald-950/80 border-emerald-800/80 text-emerald-300"
                : "bg-red-950/80 border-red-800/80 text-red-300"
            )}
          >
            {feedback.message}
          </div>
        )}

        {/* Catalog Grid */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {shop?.items.map((item) => {
              const def = item.definition
              if (!def) return null
              const style = rarityStyles[def.rarity] || rarityStyles.common
              const canAfford = character.gold >= item.price
              const isBuying = purchasingId === item.itemId

              return (
                <div
                  key={item.itemId}
                  className={cn(
                    "p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-all",
                    style.bg,
                    style.border
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("text-xs font-black", style.text)}>
                          {def.name}
                        </span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/60 border border-zinc-800 text-zinc-400">
                          {def.slot}
                        </span>
                      </div>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                        {def.rarity}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 line-clamp-2">
                      {def.description}
                    </p>
                  </div>

                  <div className="text-[10px] font-mono text-zinc-400 bg-black/40 p-1.5 rounded border border-zinc-800/80">
                    {formatStats(def.stats)}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                    <div className="flex items-center gap-1">
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs font-black font-mono text-yellow-400">
                        {item.price} Gold
                      </span>
                    </div>

                    <Button
                      size="sm"
                      disabled={!canAfford || isBuying}
                      onClick={() => handlePurchase(item)}
                      className={cn(
                        "text-xs font-black uppercase tracking-wider h-7 px-3",
                        canAfford
                          ? "bg-yellow-500 hover:bg-yellow-400 text-zinc-950 shadow-md shadow-yellow-500/20"
                          : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      )}
                    >
                      {isBuying ? "Purchasing..." : canAfford ? "Purchase" : "Need Gold"}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>
    </div>
  )
}
