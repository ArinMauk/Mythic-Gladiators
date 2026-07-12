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

  onLogUpdate: ((log: string[]) => void) | null = null;

  constructor(username: string, playerClass: GameClass) {
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

    // 3. Initialize Boss
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

    // Initial targets
    this.actors.forEach((a) => {
      if (a.faction === "player") {
        a.target = this.bossActor;
      } else {
        a.target = this.playerActor;
      }
    });
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

    // 6. Companion AI Logic (Run if alive, and not user)
    this.actors.forEach((actor) => {
      if (actor.faction === "player" && !actor.isUser && actor.health > 0) {
        this.runCompanionAI(actor, deltaTime);
      }
    });

    // 7. Boss AI Logic
    if (this.bossActor.health > 0) {
      this.runBossAI(deltaTime);
    }
  }

  runCompanionAI(actor: Actor, deltaTime: number) {
    if (actor.isCasting) return; // Wait for current cast to finish

    // Find all alive friendly targets
    const friendlyParty = this.actors.filter((a) => a.faction === "player" && a.health > 0);
    const boss = this.bossActor;

    // AIs get a list of class abilities
    const abilities = getClassAbilities(actor.class);
    if (abilities.length === 0) return;

    // Companion target acquisition: Default is boss
    actor.target = boss;

    // AI Healer Priority
    if (actor.role === "healer") {
      // Find lowest health party member
      let lowestHealthPartyMember = friendlyParty[0];
      friendlyParty.forEach((m) => {
        if (m.health / m.maxHealth < lowestHealthPartyMember.health / lowestHealthPartyMember.maxHealth) {
          lowestHealthPartyMember = m;
        }
      });

      const lowestHpRatio = lowestHealthPartyMember.health / lowestHealthPartyMember.maxHealth;

      // If anyone is under 80% health, focus on healing!
      if (lowestHpRatio < 0.8) {
        actor.target = lowestHealthPartyMember;
        const healSpell = abilities.find((ab) => !ab.requiresHostile && ab.id.includes("heal") || ab.id.includes("surge") || ab.id.includes("light"));
        if (healSpell && healSpell.canCast(actor, lowestHealthPartyMember)) {
          // Check range
          const dist = actor.position.distanceTo(lowestHealthPartyMember.position);
          if (dist > healSpell.range) {
            // Move towards them
            this.moveTowards(actor, lowestHealthPartyMember.position, healSpell.range - 2, deltaTime);
          } else {
            // Stop and cast!
            actor.velocity.set(0, 0, 0);
            healSpell.startCast(actor, lowestHealthPartyMember, this);
          }
          return;
        }
      }
    }

    // Standard Companion Damage Rotations
    // Check if we need to cast or attack boss
    if (boss.health > 0) {
      // Find best damage spell that is off cooldown
      const dpsSpell = abilities.find((ab) => ab.requiresHostile);
      if (dpsSpell && dpsSpell.canCast(actor, boss)) {
        const dist = actor.position.distanceTo(boss.position);
        if (dist > dpsSpell.range) {
          // Move towards boss
          this.moveTowards(actor, boss.position, dpsSpell.range - 2, deltaTime);
        } else {
          // Stop and cast!
          actor.velocity.set(0, 0, 0);
          dpsSpell.startCast(actor, boss, this);
        }
      } else {
        // If spell can't be cast due to resource/cooldown, let's keep moving towards boss or facing boss
        const dist = actor.position.distanceTo(boss.position);
        if (dist > 5 && actor.role === "tank") {
          this.moveTowards(actor, boss.position, 4, deltaTime);
        } else if (dist > 25 && actor.role === "damage") {
          this.moveTowards(actor, boss.position, 20, deltaTime);
        } else {
          // Stop moving and look at boss
          actor.velocity.set(0, 0, 0);
          actor.yaw = Math.atan2(boss.position.x - actor.position.x, boss.position.z - actor.position.z);
        }
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
