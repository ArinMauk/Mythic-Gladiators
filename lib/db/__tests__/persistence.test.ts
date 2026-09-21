import { describe, it } from "node:test"
import assert from "node:assert"
import { initDatabase } from "../db"
import { UserRepository } from "../repositories/user-repository"
import { CharacterRepository } from "../repositories/character-repository"
import { MatchProgressionHandler } from "@/lib/progression/match-progression-handler"
import { MatchCompletionRequest } from "@/lib/progression/types"

describe("Persistence & Progression Integration", () => {
  it("creates users and authenticates credentials", () => {
    const db = initDatabase(":memory:")
    const userRepo = new UserRepository(db)

    const user = userRepo.createUser("GladiatorMaster", "gladiator@mythic.gg", "password123")
    assert.ok(user.id)
    assert.strictEqual(user.username, "GladiatorMaster")
    assert.strictEqual(user.email, "gladiator@mythic.gg")

    const auth = userRepo.authenticateUser("GladiatorMaster", "password123")
    assert.ok(auth)
    assert.strictEqual(auth?.id, user.id)

    // Case insensitivity
    const authEmail = userRepo.authenticateUser("GLADIATOR@MYTHIC.GG", "password123")
    assert.ok(authEmail)

    // Wrong password
    const wrongAuth = userRepo.authenticateUser("GladiatorMaster", "wrongpass")
    assert.strictEqual(wrongAuth, null)
  })

  it("persists character creation, load, and progression updates", () => {
    const db = initDatabase(":memory:")
    const userRepo = new UserRepository(db)
    const charRepo = new CharacterRepository(db)

    const user = userRepo.createUser("WarriorGuy", "warrior@test.com", "secretPass")
    const character = charRepo.createCharacter({
      userId: user.id,
      name: "Gorehowl",
      class: "warrior",
    })

    assert.ok(character.id)
    assert.strictEqual(character.name, "Gorehowl")
    assert.strictEqual(character.class, "warrior")
    assert.strictEqual(character.level, 1)
    assert.strictEqual(character.xp, 0)
    assert.strictEqual(character.gold, 0)
    assert.strictEqual(character.unspentTalentPoints, 0)

    // Simulate saving updated progression
    const updated = charRepo.updateProgression({
      id: character.id,
      level: 3,
      xp: 75,
      gold: 240,
      unspentTalentPoints: 2,
    })

    assert.ok(updated)
    assert.strictEqual(updated?.level, 3)
    assert.strictEqual(updated?.xp, 75)
    assert.strictEqual(updated?.gold, 240)
    assert.strictEqual(updated?.unspentTalentPoints, 2)

    // Simulate loading again from database (re-query)
    const reloaded = charRepo.getCharacterById(character.id)
    assert.strictEqual(reloaded?.level, 3)
    assert.strictEqual(reloaded?.xp, 75)
    assert.strictEqual(reloaded?.gold, 240)
    assert.strictEqual(reloaded?.unspentTalentPoints, 2)
  })

  it("persists talent choices and updates unspent talent points", () => {
    const db = initDatabase(":memory:")
    const userRepo = new UserRepository(db)
    const charRepo = new CharacterRepository(db)

    const user = userRepo.createUser("MageUser", "mage@test.com", "secretPass")
    const character = charRepo.createCharacter({
      userId: user.id,
      name: "Antonidas",
      class: "mage",
    })

    const selectedTalents = ["pyroblast_crit", "ignite_spread"]
    const saved = charRepo.updateTalents({
      id: character.id,
      selectedTalents,
      unspentTalentPoints: 1,
    })

    assert.deepStrictEqual(saved?.selectedTalents, selectedTalents)
    assert.strictEqual(saved?.unspentTalentPoints, 1)

    const loaded = charRepo.getCharacterById(character.id)
    assert.deepStrictEqual(loaded?.selectedTalents, selectedTalents)
    assert.strictEqual(loaded?.unspentTalentPoints, 1)
  })

  it("executes match completion, updates character, and enforces idempotency against double reward claims", () => {
    const db = initDatabase(":memory:")
    const userRepo = new UserRepository(db)
    const charRepo = new CharacterRepository(db)
    const handler = new MatchProgressionHandler(db)

    const user = userRepo.createUser("RogueHero", "rogue@test.com", "pass123")
    const character = charRepo.createCharacter({
      userId: user.id,
      name: "Valeera",
      class: "rogue",
    })

    const matchReq: MatchCompletionRequest = {
      matchId: "match-uuid-12345",
      characterId: character.id,
      arenaId: "level-1",
      outcome: "victory",
    }

    // First completion
    const result1 = handler.handleMatchCompletion(matchReq, user.id)
    assert.strictEqual(result1.alreadyClaimed, false)
    assert.strictEqual(result1.xpEarned, 120)
    assert.strictEqual(result1.goldEarned, 50)
    assert.strictEqual(result1.newLevel, 2) // 120 XP crossed 100 XP threshold
    assert.strictEqual(result1.currentXp, 20)
    assert.strictEqual(result1.talentPointsEarned, 1)
    assert.strictEqual(result1.unspentTalentPoints, 1)
    assert.strictEqual(result1.totalGold, 50)

    // Character in DB should match
    const charAfterMatch = charRepo.getCharacterById(character.id)!
    assert.strictEqual(charAfterMatch.level, 2)
    assert.strictEqual(charAfterMatch.xp, 20)
    assert.strictEqual(charAfterMatch.gold, 50)
    assert.strictEqual(charAfterMatch.unspentTalentPoints, 1)

    // SUBMIT THE EXACT SAME MATCH AGAIN (Simulate duplicate network request / replay)
    const result2 = handler.handleMatchCompletion(matchReq, user.id)
    assert.strictEqual(result2.alreadyClaimed, true)
    // Should NOT award XP or gold again!
    assert.strictEqual(result2.levelsGained, 0)
    assert.strictEqual(result2.talentPointsEarned, 0)

    // Character in DB still has 20 XP and 50 gold (NOT double-awarded!)
    const charAfterReplay = charRepo.getCharacterById(character.id)!
    assert.strictEqual(charAfterReplay.level, 2)
    assert.strictEqual(charAfterReplay.xp, 20)
    assert.strictEqual(charAfterReplay.gold, 50)
    assert.strictEqual(charAfterReplay.unspentTalentPoints, 1)
  })
})
