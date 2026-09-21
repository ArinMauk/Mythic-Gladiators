import crypto from "crypto"
import { Database } from "better-sqlite3"
import shopsData from "./data/shops.json"
import { ShopConfig, InventoryItem, ItemDefinition } from "./types"
import { ItemService } from "./item-service"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"
import { CharacterModel } from "@/lib/progression/types"
import { getDb } from "@/lib/db/db"

export interface EnrichedShopItem {
  itemId: string
  price: number
  definition: ItemDefinition | null
}

export interface EnrichedShopConfig {
  id: string
  name: string
  description: string
  items: EnrichedShopItem[]
}

export class ShopService {
  static getAllShops(): EnrichedShopConfig[] {
    const shops = Object.values(shopsData as Record<string, ShopConfig>)
    return shops.map((s) => this.enrichShop(s))
  }

  static getShop(shopId: string): EnrichedShopConfig | null {
    const shop = (shopsData as Record<string, ShopConfig>)[shopId]
    if (!shop) return null
    return this.enrichShop(shop)
  }

  private static enrichShop(shop: ShopConfig): EnrichedShopConfig {
    return {
      ...shop,
      items: shop.items.map((item) => ({
        itemId: item.itemId,
        price: item.price,
        definition: ItemService.getDefinition(item.itemId),
      })),
    }
  }

  static purchaseItem({
    db,
    characterId,
    userId,
    shopId,
    itemId,
  }: {
    db?: Database
    characterId: string
    userId?: string
    shopId: string
    itemId: string
  }): {
    character: CharacterModel
    purchasedItem: InventoryItem
    definition: ItemDefinition
  } {
    const activeDb = db || getDb()
    const charRepo = new CharacterRepository(activeDb)

    // 1. Validate character
    const character = charRepo.getCharacterById(characterId)
    if (!character) {
      throw new Error(`Character not found: ${characterId}`)
    }

    if (userId && character.userId !== userId) {
      throw new Error(`Unauthorized: Character does not belong to user`)
    }

    // 2. Validate shop and catalog
    const shop = (shopsData as Record<string, ShopConfig>)[shopId]
    if (!shop) {
      throw new Error(`Shop not found: ${shopId}`)
    }

    const shopItem = shop.items.find((i) => i.itemId === itemId)
    if (!shopItem) {
      throw new Error(`Item ${itemId} is not sold in shop ${shopId}`)
    }

    const definition = ItemService.getDefinition(itemId)
    if (!definition) {
      throw new Error(`Item definition not found: ${itemId}`)
    }

    // 3. Validate funds
    const price = shopItem.price
    if (character.gold < price) {
      throw new Error(
        `Insufficient gold: required ${price}, but character has ${character.gold}`
      )
    }

    // 4. Create new item instance
    const newInstance: InventoryItem = {
      instanceId: crypto.randomUUID(),
      itemId: definition.id,
      acquiredAt: Date.now(),
    }

    const updatedInventory = [
      ...((character.inventory || []) as InventoryItem[]),
      newInstance,
    ]
    const newGold = character.gold - price

    // 5. Execute atomic database update
    let updatedCharacter: CharacterModel | null = null
    const tx = activeDb.transaction(() => {
      updatedCharacter = charRepo.updateGoldAndInventory(
        character.id,
        newGold,
        updatedInventory
      )
    })
    tx()

    if (!updatedCharacter) {
      throw new Error("Failed to persist purchase transaction")
    }

    return {
      character: updatedCharacter,
      purchasedItem: newInstance,
      definition,
    }
  }
}
