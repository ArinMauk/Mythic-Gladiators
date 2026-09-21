import { describe, it } from "node:test"
import assert from "node:assert"
import { initDatabase } from "@/lib/db/db"
import { UserRepository } from "@/lib/db/repositories/user-repository"
import { CharacterRepository } from "@/lib/db/repositories/character-repository"
import { ItemService } from "../item-service"
import { EquipmentService } from "../equipment-service"
import { DropService } from "../drop-service"
import { ShopService } from "../shop-service"
import { MatchProgressionHandler } from "@/lib/progression/match-progression-handler"
import { InventoryItem } from "../types"
import { Actor } from "@/lib/combat/actor"
import * as THREE from "three"

describe("Items, Equipment & Economy", () => {
  describe("Item Definitions & Registry", () => {
    it("loads all static item definitions with required fields", () => {
      const items = ItemService.getAllDefinitions()
      assert.ok(items.length >= 8)

      const sword = ItemService.getDefinition("rusted_gladiator_sword")
      assert.ok(sword)
      assert.strictEqual(sword?.slot, "weapon")
      assert.strictEqual(sword?.rarity, "common")
      assert.ok((sword?.stats.damageMultiplier || 0) > 0)
    })
  })

  describe("Drop Tables & Loot Rolling", () => {
    it("awards configured loot on victory and zero loot on defeat", () => {
      // Mock random function returning 0 to guarantee drop passes
      const victoryDrops = DropService.rollDrops("level-1", "victory", () => 0.05)
      assert.ok(victoryDrops.length >= 1)
      assert.ok(victoryDrops[0].id)

      const defeatDrops = DropService.rollDrops("level-1", "defeat", () => 0.05)
      assert.strictEqual(defeatDrops.length, 0)
    })

    it("rolls multiple items when configured in level-2", () => {
      const drops = DropService.rollDrops("level-2", "victory", () => 0.1)
      assert.strictEqual(drops.length, 2)
    })
  })

  describe("Inventory Persistence", () => {
    it("persists added inventory items across database reloads", () => {
      const db = initDatabase(":memory:")
      const userRepo = new UserRepository(db)
      const charRepo = new CharacterRepository(db)

      const user = userRepo.createUser("LootMaster", "loot@test.com", "pass123")
      const char = charRepo.createCharacter({
        userId: user.id,
        name: "Achilles",
        class: "warrior",
      })

      const testItem: InventoryItem = {
        instanceId: "inst-1",
        itemId: "iron_gladiator_helm",
        acquiredAt: Date.now(),
      }

      charRepo.updateInventory(char.id, [testItem])

      const reloaded = charRepo.getCharacterById(char.id)!
      assert.strictEqual(reloaded.inventory.length, 1)
      assert.strictEqual(reloaded.inventory[0].instanceId, "inst-1")
      assert.strictEqual(reloaded.inventory[0].itemId, "iron_gladiator_helm")
    })
  })

  describe("Equipment Validation & Slot Rules", () => {
    it("validates slot matching, class restrictions, and level requirements", () => {
      const warriorChar: any = {
        id: "char-1",
        class: "warrior",
        level: 1,
        inventory: [
          { instanceId: "helm-inst", itemId: "iron_gladiator_helm", acquiredAt: 100 },
          { instanceId: "robe-inst", itemId: "acolyte_robe", acquiredAt: 100 }, // priest/mage only, level 2
          { instanceId: "sword-inst", itemId: "champions_greatsword", acquiredAt: 100 }, // level 3 required
        ],
      }

      // Valid equip: Warrior equipping Iron Gladiator Helm into head slot
      const validRes = EquipmentService.validateEquip({
        character: warriorChar,
        slot: "head",
        instanceId: "helm-inst",
      })
      assert.strictEqual(validRes.valid, true)

      // Slot mismatch: trying to equip helm into chest slot
      const slotMismatchRes = EquipmentService.validateEquip({
        character: warriorChar,
        slot: "chest",
        instanceId: "helm-inst",
      })
      assert.strictEqual(slotMismatchRes.valid, false)
      assert.ok(slotMismatchRes.error?.includes("cannot equip in \"chest\""))

      // Class restriction: Warrior trying to equip Priest/Mage robe
      const classRestrictedRes = EquipmentService.validateEquip({
        character: warriorChar,
        slot: "chest",
        instanceId: "robe-inst",
      })
      assert.strictEqual(classRestrictedRes.valid, false)
      assert.ok(classRestrictedRes.error?.includes("cannot be equipped by class \"warrior\""))

      // Level requirement: Level 1 warrior trying to equip Level 3 weapon
      const levelRestrictedRes = EquipmentService.validateEquip({
        character: warriorChar,
        slot: "weapon",
        instanceId: "sword-inst",
      })
      assert.strictEqual(levelRestrictedRes.valid, false)
      assert.ok(levelRestrictedRes.error?.includes("Requires level 3"))

      // Unowned item instance
      const unownedRes = EquipmentService.validateEquip({
        character: warriorChar,
        slot: "weapon",
        instanceId: "nonexistent-item-instance",
      })
      assert.strictEqual(unownedRes.valid, false)
      assert.ok(unownedRes.error?.includes("not found"))
    })
  })

  describe("Equipment Stat Calculation & Actor Modification", () => {
    it("aggregates stats deterministically and modifies CombatSimulation Actor", () => {
      const inventory: InventoryItem[] = [
        { instanceId: "helm-1", itemId: "iron_gladiator_helm", acquiredAt: 1 }, // armor: 35, health: 40
        { instanceId: "boots-1", itemId: "worn_boots", acquiredAt: 2 }, // armor: 15, speed: 0.6
      ]

      const equipment = {
        head: "helm-1",
        feet: "boots-1",
      }

      const stats = EquipmentService.calculateEquipmentStats(equipment, inventory)
      assert.strictEqual(stats.armor, 50)
      assert.strictEqual(stats.maxHealth, 40)
      assert.strictEqual(stats.speed, 0.6)

      // Test actor modification
      const actor = new Actor(
        "player",
        "TestWarrior",
        "warrior",
        "player",
        "tank",
        new THREE.Vector3(0, 0, 0),
        true
      )

      const baseArmor = actor.stats.armor
      const baseMaxHealth = actor.maxHealth
      const baseSpeed = actor.stats.speed

      EquipmentService.applyEquipmentToActor(actor, stats)

      assert.strictEqual(actor.stats.armor, baseArmor + 50)
      assert.strictEqual(actor.maxHealth, baseMaxHealth + 40)
      assert.strictEqual(actor.health, baseMaxHealth + 40)
      assert.strictEqual(actor.stats.speed, baseSpeed + 0.6)
    })
  })

  describe("Shop & Economy System", () => {
    it("validates gold, deducts cost atomically, and grants purchased item", () => {
      const db = initDatabase(":memory:")
      const userRepo = new UserRepository(db)
      const charRepo = new CharacterRepository(db)

      const user = userRepo.createUser("ShopKeeper", "shop@test.com", "pass123")
      const char = charRepo.createCharacter({
        userId: user.id,
        name: "TraderGladiator",
        class: "warrior",
      })

      // Give character 100 gold
      charRepo.updateProgression({
        id: char.id,
        level: 1,
        xp: 0,
        gold: 100,
        unspentTalentPoints: 0,
      })

      // Buy Rusted Gladiator Sword (price 40)
      const result = ShopService.purchaseItem({
        db,
        characterId: char.id,
        userId: user.id,
        shopId: "gladiator_armory",
        itemId: "rusted_gladiator_sword",
      })

      assert.strictEqual(result.character.gold, 60)
      assert.strictEqual(result.character.inventory.length, 1)
      assert.strictEqual(result.purchasedItem.itemId, "rusted_gladiator_sword")

      // Attempt purchase when insufficient gold (Iron Breastplate costs 110 gold, character has 60)
      assert.throws(() => {
        ShopService.purchaseItem({
          db,
          characterId: char.id,
          userId: user.id,
          shopId: "gladiator_armory",
          itemId: "iron_breastplate",
        })
      }, /Insufficient gold/)

      // Ensure gold was NOT deducted after failed transaction
      const charAfterFail = charRepo.getCharacterById(char.id)!
      assert.strictEqual(charAfterFail.gold, 60)
      assert.strictEqual(charAfterFail.inventory.length, 1)
    })
  })

  describe("Loot Idempotency & Match Integration", () => {
    it("awards items on victory, persists them, and returns identical items on duplicate match submission", () => {
      const db = initDatabase(":memory:")
      const userRepo = new UserRepository(db)
      const charRepo = new CharacterRepository(db)
      const handler = new MatchProgressionHandler(db)

      const user = userRepo.createUser("LootHero", "loothero@test.com", "pass123")
      const char = charRepo.createCharacter({
        userId: user.id,
        name: "LootChamp",
        class: "warrior",
      })

      const matchReq = {
        matchId: "match-with-loot-1",
        characterId: char.id,
        arenaId: "level-2" as const, // level-2 has guaranteed 2 drops
        outcome: "victory" as const,
      }

      const res1 = handler.handleMatchCompletion(matchReq, user.id)
      assert.strictEqual(res1.alreadyClaimed, false)
      assert.ok((res1.awardedItems?.length || 0) > 0)
      const awardedCount = res1.awardedItems!.length

      const charAfterMatch = charRepo.getCharacterById(char.id)!
      assert.strictEqual(charAfterMatch.inventory.length, awardedCount)

      // SUBMIT DUPLICATE MATCH COMPLETION REQUEST
      const res2 = handler.handleMatchCompletion(matchReq, user.id)
      assert.strictEqual(res2.alreadyClaimed, true)
      assert.strictEqual(res2.levelsGained, 0)
      assert.strictEqual(res2.talentPointsEarned, 0)
      assert.strictEqual(res2.awardedItems?.length, awardedCount)

      // Character inventory has NOT been duplicated!
      const charAfterReplay = charRepo.getCharacterById(char.id)!
      assert.strictEqual(charAfterReplay.inventory.length, awardedCount)
    })
  })
})
