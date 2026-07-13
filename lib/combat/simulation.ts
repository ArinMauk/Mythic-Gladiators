import * as THREE from "three";
import { Actor } from "./actor";
import { Projectile } from "./projectile";
import { GameClass, Faction, Role, VisualEffect, FloatingText } from "./types";
import { getClassAbilities, Ability } from "./ability";

export interface DangerZone {
  id: string;
  position: THREE.Vector3;
  radius: number;
  duration: number;
  elapsed: number;
  damage: number;
  caster: Actor;
}

export class CombatSimulation {
  actors: Actor[] = [];
  projectiles: Projectile[] = [];
  dangerZones: DangerZone[] = [];
  floatingTexts: FloatingText[] = [];
  visualEffects: VisualEffect[] = [];
  battleLog: string[] = ["The Battle Arena has loaded! Prepare yourselves!"];
  
  playerActor: Actor;
  bossActor: Actor;
  selectedLevel: "level-1" | "level-2";

  onLogUpdate: ((log: string[]) => void) | null = null;

  constructor(username: string, playerClass: GameClass, selectedLevel: "level-1" | "level-2" = "level-1") {
    this.selectedLevel = selectedLevel;

    // 1. Initialize Player
    const playerRole: Role = playerClass === "priest" ? "healer" : (playerClass === "warrior" || playerClass === "paladin" ? "tank" : "damage");
    this.playerActor = new Actor(
      "user", 
      username || "Hero", 
      playerClass, 
      "player", 
      playerRole, 
      new THREE.Vector3(0, 0, 15), 
      true
    );
    this.actors.push(this.playerActor);

    // 2. Initialize Companions (Bob, Jessica, Dillan, Sarah)
    const companions = [
      { id: "bob", name: "Bob", class: "warrior" as const, role: "tank" as const, pos: new THREE.Vector3(-10, 0, 12) },
      { id: "jessica", name: "Jessica", class: "mage" as const, role: "damage" as const, pos: new THREE.Vector3(-15, 0, 15) },
      { id: "dillan", name: "Dillan", class: "priest" as const, role: "healer" as const, pos: new THREE.Vector3(10, 0, 15) },
      { id: "sarah", name: "Sarah", class: "hunter" as const, role: "damage" as const, pos: new THREE.Vector3(15, 0, 12) },
    ];

    // Filter out companions if their class matches the user's class, or just keep them to make a robust party of 5!
    // A standard WoW party has 5 members, so we keep all 4 companions + user.
    companions.forEach((comp) => {
      // If user is playing a priest, we can swap Dillan's class to shaman, or warrior to paladin, to have a nice diverse party
      let finalClass: GameClass = comp.class;
      let finalRole: Role = comp.role;
      if (comp.class === playerClass) {
        if (playerClass === "priest") {
          finalClass = "shaman";
          finalRole = "healer";
        } else if (playerClass === "warrior") {
          finalClass = "paladin";
          finalRole = "tank";
        } else if (playerClass === "mage") {
          finalClass = "warlock";
          finalRole = "damage";
        } else if (playerClass === "hunter") {
          finalClass = "rogue";
          finalRole = "damage";
        }
      }
      this.actors.push(new Actor(comp.id, comp.name, finalClass, "player", finalRole, comp.pos, false));
    });

    // 3. Initialize Enemies based on selectedLevel
    if (selectedLevel === "level-1") {
      this.bossActor = new Actor(
        "boss", 
        "Evil Raid Boss", 
        "boss", 
        "enemy", 
        "tank", 
        new THREE.Vector3(0, 0, -15), 
        false
      );
      this.actors.push(this.bossActor);
    } else {
      // Level 2: 4v4 team skirmish
      // Gladiator Captain acts as the "bossActor" (Warrior/Boss class, 500 maxHealth)
      this.bossActor = new Actor(
        "boss_captain", 
        "Gladiator Captain", 
        "boss", 
        "enemy", 
        "tank", 
        new THREE.Vector3(0, 0, -15), 
        false
      );
      this.bossActor.maxHealth = 500;
      this.bossActor.health = 500;
      this.actors.push(this.bossActor);

      // Now add 3 additional distinct enemy gladiators
      const enemyGladiators = [
        { id: "gladiator_pyro", name: "Gladiator Pyromancer", class: "mage" as const, role: "damage" as const, pos: new THREE.Vector3(-8, 0, -12) },
        { id: "gladiator_cleric", name: "Gladiator Cleric", class: "priest" as const, role: "healer" as const, pos: new THREE.Vector3(8, 0, -12) },
        { id: "gladiator_scout", name: "Gladiator Scout", class: "hunter" as const, role: "damage" as const, pos: new THREE.Vector3(12, 0, -15) },
      ];

      enemyGladiators.forEach((enemy) => {
        const actor = new Actor(enemy.id, enemy.name, enemy.class, "enemy", enemy.role, enemy.pos, false);
        this.actors.push(actor);
      });
    }

    // Set Initial Targets
    if (selectedLevel === "level-1") {
      this.actors.forEach((a) => {
        if (a.faction === "player") {
          a.target = this.bossActor;
        } else {
          a.target = this.playerActor;
        }
      });
    } else {
      // Level 2 Initial Target Selection
      this.actors.forEach((a) => {
        if (a.faction === "player") {
          a.target = this.bossActor; // Players/companions target the Gladiator Captain first
        } else {
          a.target = this.playerActor; // Enemies default target the player
        }
      });
    }
  }

  log(msg: string) {
    this.battleLog.unshift(msg);
    if (this.battleLog.length > 50) {
      this.battleLog.pop();
    }
    if (this.onLogUpdate) {
      this.onLogUpdate([...this.battleLog]);
    }
  }

  spawnProjectile(config: { start: THREE.Vector3; target: Actor; speed: number; color: string; size: number; onHit: () => void }) {
    const id = "proj_" + Math.random().toString(36).substr(2, 9);
    const proj = new Projectile({
      id,
      start: config.start,
      target: config.target,
      speed: config.speed,
      color: config.color,
      size: config.size,
      onHit: config.onHit
    });
    this.projectiles.push(proj);
  }

  spawnDangerZone(position: THREE.Vector3, radius: number, duration: number, damage: number, caster: Actor) {
    const id = "zone_" + Math.random().toString(36).substr(2, 9);
    this.dangerZones.push({
      id,
      position: position.clone(),
      radius,
      duration,
      elapsed: 0,
      damage,
      caster
    });
    this.spawnVisualEffect("aoe", position, undefined, "#ef4444", radius, duration);
  }

  spawnFloatingText(text: string, position: THREE.Vector3, color: string, isCrit: boolean = false) {
    const id = "text_" + Math.random().toString(36).substr(2, 9);
    this.floatingTexts.push({
      id,
      text,
      position: position.clone(),
      color,
      isCrit,
      duration: 1.2,
      elapsed: 0
    });
  }

  spawnVisualEffect(type: VisualEffect["type"], position: THREE.Vector3, targetPosition?: THREE.Vector3, color: string = "#ffffff", size: number = 1, duration: number = 0.5) {
    const id = "effect_" + Math.random().toString(36).substr(2, 9);
    this.visualEffects.push({
      id,
      type,
      position: position.clone(),
      targetPosition: targetPosition?.clone(),
      color,
      size,
      duration,
      elapsed: 0
    });
  }

  update(deltaTime: number) {
    // 1. Update Actors
    this.actors.forEach((actor) => {
      actor.update(deltaTime, this.bossActor);
    });

    // Clean up dead actors (except player & boss, which stay for victory/defeat handling)
    // Actually, keep them but they stay in 'die' state.

    // 2. Update Projectiles
    this.projectiles.forEach((proj) => proj.update(deltaTime));
    this.projectiles = this.projectiles.filter((proj) => !proj.isDead);

    // 3. Update Danger Zones (tick damage)
    this.dangerZones.forEach((zone) => {
      zone.elapsed += deltaTime;
      
      // Damage players inside the zone periodically (e.g. at 2s and at end of zone, or every tick)
      // Let's deal a single burst of damage when the zone expires, or deal tick damage.
      // Tick damage: every 1 second.
      const previousSec = Math.floor(zone.elapsed - deltaTime);
      const currentSec = Math.floor(zone.elapsed);
      if (currentSec > previousSec && zone.elapsed < zone.duration) {
        // Find actors inside the zone radius
        this.actors.forEach((actor) => {
          if (actor.faction === "player" && actor.health > 0) {
            const dist = actor.position.distanceTo(zone.position);
            if (dist <= zone.radius) {
              const dmgDealt = actor.takeDamage(Math.floor(zone.damage / zone.duration), zone.caster, "fire");
              if (dmgDealt > 0) {
                this.log(`${actor.name} takes ${dmgDealt} Fire damage from Rain of Fire!`);
                this.spawnFloatingText(`${dmgDealt}`, actor.position.clone().add(new THREE.Vector3(0, 1.2, 0)), "#ef4444");
              }
            }
          }
        });
      }
    });
    this.dangerZones = this.dangerZones.filter((zone) => zone.elapsed < zone.duration);

    // 4. Update Floating Texts
    this.floatingTexts.forEach((ft) => {
      ft.elapsed += deltaTime;
      // Animate text upwards slightly
      ft.position.y += deltaTime * 0.8;
    });
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.elapsed < ft.duration);

    // 5. Update Visual Effects
    this.visualEffects.forEach((eff) => {
      eff.elapsed += deltaTime;
    });
    this.visualEffects = this.visualEffects.filter((eff) => eff.elapsed < eff.duration);

    // 6. NPC AI Logic (Companions and Enemy Gladiators that aren't the boss/captain)
    this.actors.forEach((actor) => {
      if (actor.health > 0) {
        if (actor.faction === "player" && !actor.isUser) {
          this.runNPCAI(actor, deltaTime);
        } else if (actor.faction === "enemy" && actor.id !== this.bossActor.id) {
          this.runNPCAI(actor, deltaTime);
        }
      }
    });

    // 7. Boss/Gladiator Captain AI Logic
    if (this.bossActor.health > 0) {
      this.runBossAI(deltaTime);
    }
  }

  runNPCAI(actor: Actor, deltaTime: number) {
    if (actor.isCasting) return; // Wait for current cast to finish

    // Find all alive friendly targets (same faction)
    const friendlyParty = this.actors.filter((a) => a.faction === actor.faction && a.health > 0);
    // Find all alive hostile targets (opposite faction)
    const hostileEnemies = this.actors.filter((a) => a.faction !== actor.faction && a.health > 0);
    
    if (hostileEnemies.length === 0) {
      actor.velocity.set(0, 0, 0);
      return; // No enemies left, stand idle
    }

    // AIs get a list of class abilities
    const abilities = getClassAbilities(actor.class);
    if (abilities.length === 0) return;

    // Acquiring / validating current target
    let currentTarget = actor.target;
    if (!currentTarget || currentTarget.health <= 0 || currentTarget.faction === actor.faction) {
      // Default to the closest hostile enemy
      let closestHostile = hostileEnemies[0];
      let closestDist = actor.position.distanceTo(closestHostile.position);
      hostileEnemies.forEach((h) => {
        const dist = actor.position.distanceTo(h.position);
        if (dist < closestDist) {
          closestDist = dist;
          closestHostile = h;
        }
      });
      currentTarget = closestHostile;
      actor.target = currentTarget;
    }

    // AI Healer Priority (flash heal lowest HP teammate under 80%)
    if (actor.role === "healer") {
      let lowestHealthFriendly = friendlyParty[0];
      friendlyParty.forEach((m) => {
        if (m.health / m.maxHealth < lowestHealthFriendly.health / lowestHealthFriendly.maxHealth) {
          lowestHealthFriendly = m;
        }
      });

      const lowestHpRatio = lowestHealthFriendly.health / lowestHealthFriendly.maxHealth;

      if (lowestHpRatio < 0.8) {
        actor.target = lowestHealthFriendly;
        const healSpell = abilities.find((ab) => !ab.requiresHostile && (ab.id.includes("heal") || ab.id.includes("surge") || ab.id.includes("light")));
        if (healSpell && healSpell.canCast(actor, lowestHealthFriendly)) {
          const dist = actor.position.distanceTo(lowestHealthFriendly.position);
          if (dist > healSpell.range) {
            this.moveTowards(actor, lowestHealthFriendly.position, healSpell.range - 2, deltaTime);
          } else {
            actor.velocity.set(0, 0, 0);
            healSpell.startCast(actor, lowestHealthFriendly, this);
          }
          return;
        }
      }
    }

    // Standard Combat Rotation
    // Target a hostile enemy
    if (!actor.target || actor.target.faction === actor.faction || actor.target.health <= 0) {
      let closestHostile = hostileEnemies[0];
      let closestDist = actor.position.distanceTo(closestHostile.position);
      hostileEnemies.forEach((h) => {
        const dist = actor.position.distanceTo(h.position);
        if (dist < closestDist) {
          closestDist = dist;
          closestHostile = h;
        }
      });
      actor.target = closestHostile;
    }

    const hostileTarget = actor.target;
    if (!hostileTarget || hostileTarget.health <= 0) return;

    // Find best damage spell that is off cooldown
    const dpsSpell = abilities.find((ab) => ab.requiresHostile);
    if (dpsSpell && dpsSpell.canCast(actor, hostileTarget)) {
      const dist = actor.position.distanceTo(hostileTarget.position);
      if (dist > dpsSpell.range) {
        this.moveTowards(actor, hostileTarget.position, dpsSpell.range - 2, deltaTime);
      } else {
        actor.velocity.set(0, 0, 0);
        dpsSpell.startCast(actor, hostileTarget, this);
      }
    } else {
      // If spell can't be cast, approach target based on role
      const dist = actor.position.distanceTo(hostileTarget.position);
      if (dist > 5 && actor.role === "tank") {
        this.moveTowards(actor, hostileTarget.position, 4, deltaTime);
      } else if (dist > 25 && actor.role === "damage") {
        this.moveTowards(actor, hostileTarget.position, 20, deltaTime);
      } else {
        actor.velocity.set(0, 0, 0);
        actor.yaw = Math.atan2(hostileTarget.position.x - actor.position.x, hostileTarget.position.z - actor.position.z);
      }
    }
  }

  runBossAI(deltaTime: number) {
    if (this.bossActor.isCasting) return;

    // 1. Target selection (Aggro / Threat)
    let bestTarget = this.playerActor;
    let highestThreat = -1;

    this.bossActor.threatMap.forEach((threat, actorId) => {
      const actor = this.actors.find((a) => a.id === actorId);
      if (actor && actor.health > 0 && threat > highestThreat) {
        highestThreat = threat;
        bestTarget = actor;
      }
    });

    // If no threat recorded yet, target closest alive player
    if (highestThreat <= 0 || bestTarget.health <= 0) {
      const alivePlayers = this.actors.filter((a) => a.faction === "player" && a.health > 0);
      if (alivePlayers.length === 0) return; // All players are dead, boss wins!
      
      let closestDist = Infinity;
      alivePlayers.forEach((p) => {
        const dist = this.bossActor.position.distanceTo(p.position);
        if (dist < closestDist) {
          closestDist = dist;
          bestTarget = p;
        }
      });
    }

    this.bossActor.target = bestTarget;

    // 2. Boss abilities decision
    const abilities = getClassAbilities("boss");
    const smash = abilities.find((ab) => ab.id === "boss_smash")!;
    const fireRain = abilities.find((ab) => ab.id === "boss_fire_rain")!;

    // Rain of fire check (cooldown-based)
    if (fireRain.canCast(this.bossActor, null)) {
      this.bossActor.velocity.set(0, 0, 0);
      fireRain.startCast(this.bossActor, null, this);
      return;
    }

    // Melee smash check
    if (smash.canCast(this.bossActor, bestTarget)) {
      const dist = this.bossActor.position.distanceTo(bestTarget.position);
      if (dist > smash.range) {
        // Move towards target
        this.moveTowards(this.bossActor, bestTarget.position, smash.range - 1.5, deltaTime);
      } else {
        // Stop and smash!
        this.bossActor.velocity.set(0, 0, 0);
        smash.startCast(this.bossActor, bestTarget, this);
      }
    } else {
      // Just move towards target if too far away
      const dist = this.bossActor.position.distanceTo(bestTarget.position);
      if (dist > smash.range - 1) {
        this.moveTowards(this.bossActor, bestTarget.position, smash.range - 1, deltaTime);
      } else {
        // Melee auto attack logic if spell on cooldown
        this.bossActor.velocity.set(0, 0, 0);
        this.bossActor.yaw = Math.atan2(bestTarget.position.x - this.bossActor.position.x, bestTarget.position.z - this.bossActor.position.z);
        
        // Pseudo auto-attack on cooldowns
        if (this.bossActor.getCooldown("auto_attack") <= 0) {
          this.bossActor.triggerCooldown("auto_attack", 2.0);
          this.bossActor.setAnimState("attack_melee", 0.4);
          const autoDmg = 15 + Math.floor(Math.random() * 10);
          const actualAuto = bestTarget.takeDamage(autoDmg, this.bossActor, "melee");
          this.log(`${this.bossActor.name} strikes ${bestTarget.name} for ${actualAuto} melee damage.`);
          this.spawnFloatingText(`${actualAuto}`, bestTarget.position.clone().add(new THREE.Vector3(0, 1.2, 0)), "#dc2626");
        }
      }
    }
  }

  moveTowards(actor: Actor, targetPos: THREE.Vector3, stopRange: number, deltaTime: number) {
    const dir = targetPos.clone().sub(actor.position);
    dir.y = 0; // maintain ground level
    const dist = dir.length();

    if (dist <= stopRange) {
      actor.velocity.set(0, 0, 0);
      actor.yaw = Math.atan2(dir.x, dir.z);
    } else {
      dir.normalize();
      actor.velocity.copy(dir).multiplyScalar(actor.stats.speed);
      actor.yaw = Math.atan2(dir.x, dir.z);
    }
  }
}
