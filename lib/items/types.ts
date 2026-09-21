import { GameClass } from "@/lib/progression/types"

export type ItemRarity = "common" | "uncommon" | "rare" | "epic" | "legendary"

export type EquipmentSlot =
  | "weapon"
  | "head"
  | "chest"
  | "hands"
  | "legs"
  | "feet"

export type ItemType = "equipment" | "consumable" | "material"

export interface ItemStats {
  maxHealth?: number
  armor?: number
  speed?: number
  spellCrit?: number
  damageMultiplier?: number
  healingMultiplier?: number
}

export interface ItemVisual {
  modelId?: string
  attachmentPoint?: string
  cosmeticId?: string
}

export interface ItemDefinition {
  id: string
  name: string
  description: string
  type: ItemType
  slot?: EquipmentSlot
  rarity: ItemRarity
  requiredLevel?: number
  allowedClasses?: GameClass[]
  stats: ItemStats
  buyPrice: number
  sellPrice: number
  icon: string
  visual?: ItemVisual
}

export interface InventoryItem {
  instanceId: string
  itemId: string
  acquiredAt: number
}

export type EquipmentLoadout = Partial<Record<EquipmentSlot, string>>

export interface ResolvedInventoryItem extends InventoryItem {
  definition: ItemDefinition
}

export interface DropPoolEntry {
  itemId: string
  weight: number
}

export interface ArenaDropTable {
  rolls: number
  chance: number // probability that any drop rolls (0.0 to 1.0)
  pool: DropPoolEntry[]
}

export interface ShopItemConfig {
  itemId: string
  price: number
}

export interface ShopConfig {
  id: string
  name: string
  description: string
  items: ShopItemConfig[]
}
