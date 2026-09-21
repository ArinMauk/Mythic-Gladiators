import dropTablesData from "./data/drop-tables.json"
import { ArenaDropTable, ItemDefinition } from "./types"
import { ItemService } from "./item-service"
import { LevelId } from "@/lib/progression/config"

export class DropService {
  /**
   * Deterministically or probabilistically rolls item drops upon arena completion.
   */
  static rollDrops(
    arenaId: LevelId,
    outcome: "victory" | "defeat",
    randomFn: () => number = Math.random
  ): ItemDefinition[] {
    if (outcome !== "victory") {
      return []
    }

    const table = (dropTablesData as Record<string, ArenaDropTable>)[arenaId]
    if (!table || !table.pool || table.pool.length === 0) {
      return []
    }

    // Check overall chance for drops in this arena run
    if (randomFn() > table.chance) {
      return []
    }

    const totalWeight = table.pool.reduce((sum, entry) => sum + entry.weight, 0)
    if (totalWeight <= 0) return []

    const awardedDrops: ItemDefinition[] = []
    const rollsCount = Math.max(1, table.rolls || 1)

    for (let r = 0; r < rollsCount; r++) {
      let roll = randomFn() * totalWeight
      let selectedItemId: string | null = null

      for (const entry of table.pool) {
        if (roll <= entry.weight) {
          selectedItemId = entry.itemId
          break
        }
        roll -= entry.weight
      }

      if (!selectedItemId && table.pool.length > 0) {
        selectedItemId = table.pool[table.pool.length - 1].itemId
      }

      if (selectedItemId) {
        const def = ItemService.getDefinition(selectedItemId)
        if (def) {
          awardedDrops.push(def)
        }
      }
    }

    return awardedDrops
  }
}
