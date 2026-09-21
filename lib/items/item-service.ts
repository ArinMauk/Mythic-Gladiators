import itemsData from "./data/items.json"
import {
  ItemDefinition,
  InventoryItem,
  EquipmentLoadout,
  ResolvedInventoryItem,
  EquipmentSlot,
} from "./types"

const itemMap = new Map<string, ItemDefinition>()
for (const item of itemsData as ItemDefinition[]) {
  itemMap.set(item.id, item)
}

export class ItemService {
  static getAllDefinitions(): ItemDefinition[] {
    return Array.from(itemMap.values())
  }

  static getDefinition(itemId: string): ItemDefinition | null {
    return itemMap.get(itemId) || null
  }

  static resolveInventory(inventory: InventoryItem[] = []): ResolvedInventoryItem[] {
    const resolved: ResolvedInventoryItem[] = []
    for (const inv of inventory) {
      const def = this.getDefinition(inv.itemId)
      if (def) {
        resolved.push({
          ...inv,
          definition: def,
        })
      }
    }
    return resolved
  }

  static resolveEquipment(
    equipment: EquipmentLoadout = {},
    inventory: InventoryItem[] = []
  ): Partial<Record<EquipmentSlot, ResolvedInventoryItem>> {
    const resolved: Partial<Record<EquipmentSlot, ResolvedInventoryItem>> = {}
    const invMap = new Map<string, InventoryItem>()
    for (const item of inventory) {
      invMap.set(item.instanceId, item)
    }

    for (const [slotKey, instanceId] of Object.entries(equipment)) {
      if (!instanceId) continue
      const slot = slotKey as EquipmentSlot
      const invItem = invMap.get(instanceId)
      if (invItem) {
        const def = this.getDefinition(invItem.itemId)
        if (def) {
          resolved[slot] = {
            ...invItem,
            definition: def,
          }
        }
      }
    }

    return resolved
  }
}
