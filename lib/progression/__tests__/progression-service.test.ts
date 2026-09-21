import { describe, it } from "node:test"
import assert from "node:assert"
import { ProgressionService } from "../progression-service"
import { ARENA_REWARDS, PROGRESSION_CONFIG } from "../config"

describe("ProgressionService", () => {
  it("awards XP and gold normally upon victory in level-1", () => {
    const result = ProgressionService.calculateMatchProgression({
      currentLevel: 1,
      currentXp: 0,
      currentGold: 10,
      currentUnspentTalentPoints: 0,
      arenaId: "level-1",
      outcome: "victory",
    })

    assert.strictEqual(result.xpEarned, ARENA_REWARDS["level-1"].xp) // 120
    assert.strictEqual(result.goldEarned, ARENA_REWARDS["level-1"].gold) // 50
    assert.strictEqual(result.newGold, 60)
    // Level 1 -> 2 threshold is 100 XP. With 120 XP earned, levels up to 2 with 20 XP remaining!
    assert.strictEqual(result.newLevel, 2)
    assert.strictEqual(result.newXp, 20)
    assert.strictEqual(result.levelsGained, 1)
    assert.strictEqual(result.talentPointsEarned, 1)
    assert.strictEqual(result.newUnspentTalentPoints, 1)
  })

  it("awards no XP or gold on defeat", () => {
    const result = ProgressionService.calculateMatchProgression({
      currentLevel: 2,
      currentXp: 40,
      currentGold: 100,
      currentUnspentTalentPoints: 1,
      arenaId: "level-1",
      outcome: "defeat",
    })

    assert.strictEqual(result.xpEarned, 0)
    assert.strictEqual(result.goldEarned, 0)
    assert.strictEqual(result.newLevel, 2)
    assert.strictEqual(result.newXp, 40)
    assert.strictEqual(result.newGold, 100)
    assert.strictEqual(result.levelsGained, 0)
    assert.strictEqual(result.talentPointsEarned, 0)
    assert.strictEqual(result.newUnspentTalentPoints, 1)
  })

  it("correctly handles earning XP without crossing a level threshold", () => {
    // Level 2 -> 3 requires 150 XP. Start at 10 XP, add 50 XP -> 60 XP
    const { newLevel, newXp, levelsGained, talentPointsEarned } =
      ProgressionService.calculateXpAddition({
        currentLevel: 2,
        currentXp: 10,
        xpToAdd: 50,
      })

    assert.strictEqual(newLevel, 2)
    assert.strictEqual(newXp, 60)
    assert.strictEqual(levelsGained, 0)
    assert.strictEqual(talentPointsEarned, 0)
  })

  it("handles crossing multiple levels from a large XP reward", () => {
    // Thresholds: Level 1->2: 100 XP; Level 2->3: 150 XP; Level 3->4: 220 XP.
    // Total for Level 1 -> Level 3 is 250 XP. If given 300 XP:
    // Level 1 -> Level 3 with 50 leftover XP.
    const { newLevel, newXp, levelsGained, talentPointsEarned, levelUpEvents } =
      ProgressionService.calculateXpAddition({
        currentLevel: 1,
        currentXp: 0,
        xpToAdd: 300,
      })

    assert.strictEqual(newLevel, 3)
    assert.strictEqual(newXp, 50)
    assert.strictEqual(levelsGained, 2)
    assert.strictEqual(talentPointsEarned, 2)
    assert.strictEqual(levelUpEvents.length, 2)
    assert.strictEqual(levelUpEvents[0].newLevel, 2)
    assert.strictEqual(levelUpEvents[1].newLevel, 3)
  })

  it("clamps at maximum level cap and does not advance level beyond cap", () => {
    // Max level is 10
    const { newLevel, newXp, levelsGained, talentPointsEarned } =
      ProgressionService.calculateXpAddition({
        currentLevel: 9,
        currentXp: 100,
        // Level 9->10 requires 1100. Give 5000 XP.
        xpToAdd: 5000,
      })

    assert.strictEqual(newLevel, PROGRESSION_CONFIG.maxLevel)
    assert.strictEqual(levelsGained, 1)
    assert.strictEqual(talentPointsEarned, 1)
    // At level 10, isMaxLevel is true
    assert.strictEqual(newLevel, 10)
  })

  it("does not award additional levels or talent points when already at max level", () => {
    const { newLevel, newXp, levelsGained, talentPointsEarned } =
      ProgressionService.calculateXpAddition({
        currentLevel: PROGRESSION_CONFIG.maxLevel,
        currentXp: 500,
        xpToAdd: 1000,
      })

    assert.strictEqual(newLevel, PROGRESSION_CONFIG.maxLevel)
    assert.strictEqual(levelsGained, 0)
    assert.strictEqual(talentPointsEarned, 0)
  })

  it("calculates progress percentage correctly towards next level", () => {
    // Level 2 -> 3 needs 150 XP. If at 75 XP, progress should be 50%
    const result = ProgressionService.calculateMatchProgression({
      currentLevel: 2,
      currentXp: 0,
      currentGold: 0,
      currentUnspentTalentPoints: 0,
      arenaId: "level-1", // gives 120 XP
      outcome: "victory",
    })

    // 120 / 150 = 80%
    assert.strictEqual(result.newLevel, 2)
    assert.strictEqual(result.newXp, 120)
    assert.strictEqual(result.xpForNextLevel, 150)
    assert.strictEqual(result.xpProgressPercentage, 80)
  })
})
