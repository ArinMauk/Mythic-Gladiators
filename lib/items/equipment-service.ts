import {
  EquipmentLoadout,
  InventoryItem,
  ItemStats,
  EquipmentSlot,
  ItemDefinition,
} from "./types"
import { ItemService } from "./item-service"
import { CharacterModel } from "@/lib/progression/types"
import { Actor } from "@/lib/combat/actor"

export class EquipmentService {
  /**
   * Deterministically aggregates stats from all equipped items.
   */
  static calculateEquipmentStats(
    equipment: EquipmentLoadout = {},
    inventory: InventoryItem[] = []
  ): ItemStats {
    const aggregated: Required<ItemStats> = {
      maxHealth: 0,
      armor: 0,
      speed: 0,
      spellCrit: 0,
      damageMultiplier: 0,
      healingMultiplier: 0,
    }

    const resolved = ItemService.resolveEquipment(equipment, inventory)

    for (const item of Object.values(resolved)) {
      if (!item || !item.definition) continue
      const { stats } = item.definition

      if (stats.maxHealth) aggregated.maxHealth += stats.maxHealth
      if (stats.armor) aggregated.armor += stats.armor
      if (stats.speed) aggregated.speed += stats.speed
      if (stats.spellCrit) aggregated.spellCrit += stats.spellCrit
      if (stats.damageMultiplier) aggregated.damageMultiplier += stats.damageMultiplier
      if (stats.healingMultiplier) aggregated.healingMultiplier += stats.healingMultiplier
    }

    return {
      maxHealth: Math.round(aggregated.maxHealth),
      armor: Math.round(aggregated.armor),
      speed: Number(aggregated.speed.toFixed(2)),
      spellCrit: Number(aggregated.spellCrit.toFixed(3)),
      damageMultiplier: Number(aggregated.damageMultiplier.toFixed(3)),
      healingMultiplier: Number(aggregated.healingMultiplier.toFixed(3)),
    }
  }

  /**
   * Validates whether a character can equip a specific item instance into a given slot.
   */
  static validateEquip({
    character,
    slot,
    instanceId,
  }: {
    character: CharacterModel
    slot: EquipmentSlot
    instanceId: string
  }): {
    valid: boolean
    error?: string
    definition?: ItemDefinition
    inventoryItem?: InventoryItem
  } {
    const inventory = (character.inventory || []) as InventoryItem[]
    const invItem = inventory.find((i) => i.instanceId === instanceId)

    if (!invItem) {
      return { valid: false, error: "Item instance not found in character inventory" }
    }

    const def = ItemService.getDefinition(invItem.itemId)
    if (!def) {
      return { valid: false, error: "Item definition does not exist" }
    }

    if (def.type !== "equipment" || def.slot !== slot) {
      return {
        valid: false,
        error: `Item "${def.name}" belongs in slot "${def.slot}", cannot equip in "${slot}"`,
      }
    }

    if (def.allowedClasses && def.allowedClasses.length > 0) {
      if (!def.allowedClasses.includes(character.class)) {
        return {
          valid: false,
          error: `Item "${def.name}" cannot be equipped by class "${character.class}"`,
        }
      }
    }

    if (def.requiredLevel && character.level < def.requiredLevel) {
      return {
        valid: false,
        error: `Requires level ${def.requiredLevel} (current level is ${character.level})`,
      }
    }

    return {
      valid: true,
      definition: def,
      inventoryItem: invItem,
    }
  }

  /**
   * Applies equipment bonuses directly to an Actor instance in CombatSimulation.
   */
  static applyEquipmentToActor(actor: Actor, equipmentStats: ItemStats): void {
    if (equipmentStats.armor) {
      actor.stats.armor += equipmentStats.armor
    }
    if (equipmentStats.speed) {
      actor.stats.speed += equipmentStats.speed
    }
    if (equipmentStats.spellCrit) {
      actor.stats.spellCrit += equipmentStats.spellCrit
    }
    if (equipmentStats.damageMultiplier) {
      actor.damageMultiplier += equipmentStats.damageMultiplier
    }
    if (equipmentStats.healingMultiplier) {
      actor.healingMultiplier += equipmentStats.healingMultiplier
    }
    if (equipmentStats.maxHealth) {
      actor.maxHealth += equipmentStats.maxHealth
      actor.health = actor.maxHealth
    }
  }
}
