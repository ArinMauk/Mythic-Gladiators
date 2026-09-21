"use client"

import React, { useState } from "react"
import { useGame } from "@/lib/game-context"
import { CharacterModel } from "@/lib/progression/types"
import { EquipmentSlot, InventoryItem, ItemDefinition } from "@/lib/items/types"
import { ItemService } from "@/lib/items/item-service"
import { EquipmentService } from "@/lib/items/equipment-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Shield,
  Heart,
  Sparkles,
  Zap,
  Sword,
  X,
  Check,
  Footprints,
  Hand,
  Crown,
  Layers,
  Coins,
  ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface InventoryEquipmentModalProps {
  character: CharacterModel
  isOpen: boolean
  onClose: () => void
}

const slotLabels: Record<EquipmentSlot, { name: string; icon: any }> = {
  weapon: { name: "Weapon", icon: Sword },
  head: { name: "Head", icon: Crown },
  chest: { name: "Chest", icon: Shield },
  hands: { name: "Hands", icon: Hand },
  legs: { name: "Legs", icon: Layers },
  feet: { name: "Feet", icon: Footprints },
}

const rarityStyles: Record<string, { text: string; bg: string; border: string }> = {
  common: { text: "text-zinc-300", bg: "bg-zinc-900", border: "border-zinc-700" },
  uncommon: { text: "text-emerald-400", bg: "bg-emerald-950/20", border: "border-emerald-600/50" },
  rare: { text: "text-blue-400", bg: "bg-blue-950/20", border: "border-blue-600/50" },
  epic: { text: "text-purple-400", bg: "bg-purple-950/20", border: "border-purple-600/50" },
  legendary: { text: "text-amber-400", bg: "bg-amber-950/20", border: "border-amber-500/50" },
}

export function InventoryEquipmentModal({
  character,
  isOpen,
  onClose,
}: InventoryEquipmentModalProps) {
  const { refreshCharacters } = useGame()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>("")

  if (!isOpen) return null

  const inventory = (character.inventory || []) as InventoryItem[]
  const equipment = (character.equipment || {}) as Record<EquipmentSlot, string | undefined>

  // Resolve equipped items
  const resolvedEquipment = ItemService.resolveEquipment(equipment, inventory)
  const aggregatedStats = EquipmentService.calculateEquipmentStats(equipment, inventory)

  // Resolve inventory items
  const resolvedInventory = ItemService.resolveInventory(inventory)

  const handleEquip = async (slot: EquipmentSlot, instanceId: string) => {
    setLoadingAction(`equip-${instanceId}`)
    setErrorMessage("")
    try {
      const res = await fetch(`/api/characters/${character.id}/equip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, instanceId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to equip item")
        return
      }
      await refreshCharacters()
    } catch (err) {
      setErrorMessage("Network error while equipping item")
    } finally {
      setLoadingAction(null)
    }
  }

  const handleUnequip = async (slot: EquipmentSlot) => {
    setLoadingAction(`unequip-${slot}`)
    setErrorMessage("")
    try {
      const res = await fetch(`/api/characters/${character.id}/unequip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to unequip item")
        return
      }
      await refreshCharacters()
    } catch (err) {
      setErrorMessage("Network error while unequipping item")
    } finally {
      setLoadingAction(null)
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
      <Card className="relative border-amber-500/40 bg-zinc-950/95 max-w-5xl w-full shadow-2xl overflow-hidden border-2 flex flex-col my-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-wider text-foreground flex items-center gap-2">
                {character.name}&apos;s Armament
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold uppercase">
                  Level {character.level} {character.class}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Equip gear to bolster your gladiator&apos;s combat effectiveness in the arena.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-2 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-950/80 border-b border-red-800/80 px-4 py-2 text-xs font-bold text-red-300 text-center">
            {errorMessage}
          </div>
        )}

        {/* Modal Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 p-4 sm:p-6 overflow-y-auto">
          {/* LEFT: 6 Equipment Slots + Stats summary */}
          <div className="md:col-span-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sword className="w-4 h-4" />
              Equipped Armor & Weapons
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(Object.keys(slotLabels) as EquipmentSlot[]).map((slot) => {
                const info = slotLabels[slot]
                const SlotIcon = info.icon
                const equippedItem = resolvedEquipment[slot]
                const style = equippedItem?.definition
                  ? rarityStyles[equippedItem.definition.rarity] || rarityStyles.common
                  : null

                return (
                  <div
                    key={slot}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col justify-between transition-all min-h-[90px]",
                      equippedItem
                        ? `${style?.bg} ${style?.border} shadow-sm`
                        : "border-zinc-800/80 bg-zinc-900/30 border-dashed"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-center text-zinc-400">
                          <SlotIcon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block leading-none">
                            {info.name}
                          </span>
                          <span className={cn("text-xs font-black truncate block mt-0.5", style?.text || "text-zinc-600")}>
                            {equippedItem?.definition?.name || "Empty Slot"}
                          </span>
                        </div>
                      </div>

                      {equippedItem && (
                        <button
                          onClick={() => handleUnequip(slot)}
                          disabled={loadingAction === `unequip-${slot}`}
                          className="text-[10px] font-bold uppercase text-zinc-500 hover:text-red-400 px-1.5 py-0.5 rounded border border-transparent hover:border-red-900/50 hover:bg-red-950/30 transition-all"
                        >
                          Unequip
                        </button>
                      )}
                    </div>

                    {equippedItem?.definition && (
                      <div className="mt-2 text-[10px] font-mono text-zinc-400 truncate">
                        {formatStats(equippedItem.definition.stats)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Aggregated Stat Bonuses Panel */}
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-300 block">
                Total Equipment Bonuses
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold block">Armor</span>
                  <span className="font-mono font-black text-amber-400">+{aggregatedStats.armor}</span>
                </div>
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold block">Health</span>
                  <span className="font-mono font-black text-emerald-400">+{aggregatedStats.maxHealth}</span>
                </div>
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold block">Speed</span>
                  <span className="font-mono font-black text-cyan-400">+{aggregatedStats.speed}</span>
                </div>
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold block">Damage</span>
                  <span className="font-mono font-black text-red-400">
                    +{Math.round((aggregatedStats.damageMultiplier || 0) * 100)}%
                  </span>
                </div>
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold block">Healing</span>
                  <span className="font-mono font-black text-green-400">
                    +{Math.round((aggregatedStats.healingMultiplier || 0) * 100)}%
                  </span>
                </div>
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 font-bold block">Spell Crit</span>
                  <span className="font-mono font-black text-purple-400">
                    +{Math.round((aggregatedStats.spellCrit || 0) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Backpack / Inventory Grid */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                Gladiator Backpack ({resolvedInventory.length} Items)
              </h3>
              <span className="text-[11px] text-yellow-400 font-bold font-mono flex items-center gap-1">
                <Coins className="w-3.5 h-3.5" />
                {character.gold} Gold
              </span>
            </div>

            {resolvedInventory.length === 0 ? (
              <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center bg-zinc-900/20">
                <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-xs font-bold text-zinc-400">Your backpack is empty.</p>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Win arena battles or visit the Armory to acquire loot and equipment!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                {resolvedInventory.map((item) => {
                  const def = item.definition
                  const style = rarityStyles[def.rarity] || rarityStyles.common
                  const isCurrentlyEquipped = Object.values(equipment).includes(item.instanceId)
                  const targetSlot = def.slot as EquipmentSlot

                  return (
                    <div
                      key={item.instanceId}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex flex-col justify-between gap-2",
                        style.bg,
                        style.border,
                        isCurrentlyEquipped ? "opacity-90 ring-1 ring-primary/40" : ""
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-black", style.text)}>
                              {def.name}
                            </span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-black/60 border border-zinc-800 text-zinc-400">
                              {def.slot}
                            </span>
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                              {def.rarity}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">
                            {def.description}
                          </p>
                        </div>

                        {isCurrentlyEquipped ? (
                          <span className="text-[10px] font-black uppercase text-primary bg-primary/20 border border-primary/30 px-2 py-1 rounded flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" />
                            Equipped
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            disabled={loadingAction === `equip-${item.instanceId}`}
                            onClick={() => handleEquip(targetSlot, item.instanceId)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs uppercase tracking-wider h-7 px-3 shrink-0"
                          >
                            Equip
                          </Button>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60 font-mono">
                        <span>{formatStats(def.stats)}</span>
                        {def.allowedClasses && (
                          <span className="text-zinc-500 capitalize">
                            {def.allowedClasses.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
