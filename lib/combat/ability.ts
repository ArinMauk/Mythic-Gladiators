import * as THREE from "three";
import { Actor } from "./actor";
import { SkillCost, ResourceType } from "./types";

export abstract class Ability {
  abstract id: string;
  abstract name: string;
  abstract icon: string; // Path or Lucide name
  abstract castTime: number; // 0 for instant, > 0 for cast
  abstract cooldown: number; // In seconds
  abstract range: number; // Max range in meters
  abstract cost: SkillCost;

  requiresTarget: boolean = true;
  requiresHostile: boolean = true;

  // Verification
  canCast(caster: Actor, target: Actor | null): boolean {
    if (this.requiresTarget && !target) return false;
    if (caster.getCooldown(this.id) > 0) return false;
    if (caster.currentResource(this.cost.resource) < this.cost.amount) return false;
    if (caster.isCasting || caster.isGCDActive()) return false;
    
    if (this.requiresTarget && target) {
      const distance = caster.position.distanceTo(target.position);
      if (distance > this.range) return false;
      
      const isFriendly = caster.faction === target.faction;
      if (this.requiresHostile && isFriendly) return false;
      if (!this.requiresHostile && this.requiresTarget && !isFriendly) return false;
    }
    return true;
  }

  // Cast Phase
  startCast(caster: Actor, target: Actor | null, simulation: any) {
    if (!this.canCast(caster, target)) return;
    
    caster.spendResource(this.cost.resource, this.cost.amount);
    if (this.castTime > 0) {
      caster.startCastTimer(this.name, this.castTime, () => {
        this.execute(caster, target, simulation);
        caster.triggerCooldown(this.id, this.cooldown);
      });
    } else {
      this.execute(caster, target, simulation);
      caster.triggerCooldown(this.id, this.cooldown);
      caster.triggerGCD();
    }
  }

  // Execution Phase (To be overridden by individual spells)
  abstract execute(caster: Actor, target: Actor | null, simulation: any): void;
}

// 1. Warrior Abilities

export class MortalStrike extends Ability {
  id = "mortal_strike";
  name = "Mortal Strike";
  icon = "Shield";
  castTime = 0;
  cooldown = 6;
  range = 4; // melee range
  cost = { resource: "rage" as const, amount: 30 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.5);
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 45 + Math.floor(Math.random() * 15);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    
    const actualDmg = target.takeDamage(damage, caster, isCrit ? "physical_crit" : "physical");
    simulation.log(`${caster.name} executes Mortal Strike on ${target.name} for ${actualDmg} damage!${isCrit ? " (Critical!)" : ""}`);
    simulation.spawnFloatingText(
      `${actualDmg}${isCrit ? "!" : ""}`, 
      target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 
      isCrit ? "#ef4444" : "#f97316", 
      isCrit
    );
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#ef4444", 1.0, 0.4);
  }
}

export class Charge extends Ability {
  id = "charge";
  name = "Charge";
  icon = "Activity";
  castTime = 0;
  cooldown = 12;
  range = 25;
  cost = { resource: "rage" as const, amount: 0 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    const distance = caster.position.distanceTo(target.position);
    if (distance < 6) return; // Charge has a min range of 6m

    // Instantly charge caster to target position
    const dir = target.position.clone().sub(caster.position).normalize();
    caster.position.copy(target.position).addScaledVector(dir, -2.5); // position behind target slightly
    caster.addResource("rage", 20); // generates 20 rage

    simulation.log(`${caster.name} charges at ${target.name} and gains 20 Rage!`);
    simulation.spawnFloatingText("+20 Rage", caster.position.clone().add(new THREE.Vector3(0, 1.8, 0)), "#ef4444", false);
    simulation.spawnVisualEffect("aoe", caster.position, undefined, "#f97316", 2.0, 0.5);
  }
}

// 2. Priest Abilities

export class Smite extends Ability {
  id = "smite";
  name = "Smite";
  icon = "Sun";
  castTime = 1.5;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 40 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 25,
      color: "#f59e0b",
      size: 0.3,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 35 + Math.floor(Math.random() * 15);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, isCrit ? "holy_crit" : "holy");
        simulation.log(`${caster.name}'s Smite strikes ${target.name} for ${actualDmg} damage!`);
        simulation.spawnFloatingText(
          `${actualDmg}`, 
          target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 
          "#eab308", 
          isCrit
        );
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#eab308", 1.2, 0.3);
      }
    });
  }
}

export class FlashHeal extends Ability {
  id = "flash_heal";
  name = "Flash Heal";
  icon = "Heart";
  castTime = 1.5;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 80 };
  requiresTarget = true;
  requiresHostile = false; // friendly only

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseHeal = 60 + Math.floor(Math.random() * 20);
    const healVal = isCrit ? baseHeal * 2 : baseHeal;
    const actualHeal = target.heal(healVal, caster);

    simulation.log(`${caster.name} casts Flash Heal on ${target.name} for ${actualHeal} health!`);
    simulation.spawnFloatingText(
      `+${actualHeal}`, 
      target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 
      "#10b981", 
      isCrit
    );
    simulation.spawnVisualEffect("heal_burst", target.position, undefined, "#10b981", 1.5, 0.5);
  }
}

// 3. Hunter Abilities

export class SteadyShot extends Ability {
  id = "steady_shot";
  name = "Steady Shot";
  icon = "Target";
  castTime = 1.5;
  cooldown = 0;
  range = 40;
  cost = { resource: "focus" as const, amount: 0 }; // generates focus
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 35,
      color: "#22c55e",
      size: 0.15,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 20 + Math.floor(Math.random() * 10);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "physical");
        caster.addResource("focus", 10); // generates 10 focus

        simulation.log(`${caster.name}'s Steady Shot hits ${target.name} for ${actualDmg} damage and generates 10 Focus!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#22c55e", isCrit);
        simulation.spawnFloatingText("+10 Focus", caster.position.clone().add(new THREE.Vector3(0, 1.8, 0)), "#eab308", false);
      }
    });
  }
}

export class ArcaneShot extends Ability {
  id = "arcane_shot";
  name = "Arcane Shot";
  icon = "Sparkles";
  castTime = 0;
  cooldown = 0; // spammable with resource
  range = 40;
  cost = { resource: "focus" as const, amount: 30 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 40,
      color: "#3b82f6",
      size: 0.2,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 40 + Math.floor(Math.random() * 15);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "arcane");

        simulation.log(`${caster.name}'s Arcane Shot hits ${target.name} for ${actualDmg} damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#3b82f6", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#3b82f6", 1.0, 0.3);
      }
    });
  }
}

// 4. Rogue Abilities

export class SinisterStrike extends Ability {
  id = "sinister_strike";
  name = "Sinister Strike";
  icon = "Sword";
  castTime = 0;
  cooldown = 0;
  range = 4;
  cost = { resource: "energy" as const, amount: 40 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.3);
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 35 + Math.floor(Math.random() * 10);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");

    simulation.log(`${caster.name} performs Sinister Strike on ${target.name} for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#facc15", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#eab308", 0.8, 0.25);
  }
}

export class Eviscerate extends Ability {
  id = "eviscerate";
  name = "Eviscerate";
  icon = "Skull";
  castTime = 0;
  cooldown = 0;
  range = 4;
  cost = { resource: "energy" as const, amount: 35 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.4);
    
    // In our simplified combat system, Eviscerate deals massive damage based on Rogue's energy spent or fixed massive finisher
    const isCrit = Math.random() < caster.stats.spellCrit + 0.1; // eviscerate has extra crit
    const baseDamage = 65 + Math.floor(Math.random() * 25);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");

    simulation.log(`${caster.name} executes Eviscerate on ${target.name} dealing ${actualDmg} finisher damage!`);
    simulation.spawnFloatingText(`${actualDmg}!`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#dc2626", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#dc2626", 1.5, 0.4);
  }
}

// 5. Mage Abilities

export class Fireball extends Ability {
  id = "fireball";
  name = "Fireball";
  icon = "Flame";
  castTime = 2.0;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 100 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 25,
      color: "#f97316",
      size: 0.35,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 70 + Math.floor(Math.random() * 20);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, isCrit ? "fire_crit" : "fire");

        simulation.log(`${caster.name}'s Fireball bursts on ${target.name} for ${actualDmg} damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#f97316", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#ea580c", 1.5, 0.5);
      }
    });
  }
}

export class Blink extends Ability {
  id = "blink";
  name = "Blink";
  icon = "Wind";
  castTime = 0;
  cooldown = 15;
  range = 15;
  cost = { resource: "mana" as const, amount: 50 };
  requiresTarget = false;
  requiresHostile = false;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    // Leap forward in current direction (defined by yaw angle)
    const forward = new THREE.Vector3(Math.sin(caster.yaw), 0, Math.cos(caster.yaw)).normalize();
    
    // Spawn effect at original position
    simulation.spawnVisualEffect("aoe", caster.position.clone(), undefined, "#3b82f6", 1.5, 0.4);
    
    caster.position.addScaledVector(forward, 15);
    // Clamp boundaries
    const dst = Math.sqrt(caster.position.x * caster.position.x + caster.position.z * caster.position.z);
    if (dst > 38) {
      caster.position.setLength(38);
    }
    
    simulation.log(`${caster.name} blinks forward 15 meters!`);
    simulation.spawnVisualEffect("aoe", caster.position.clone(), undefined, "#60a5fa", 1.5, 0.4);
  }
}

// 6. Warlock Abilities

export class ShadowBolt extends Ability {
  id = "shadow_bolt";
  name = "Shadow Bolt";
  icon = "Moon";
  castTime = 2.0;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 80 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 20,
      color: "#a855f7",
      size: 0.3,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 60 + Math.floor(Math.random() * 20);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "shadow");

        simulation.log(`${caster.name}'s Shadow Bolt hits ${target.name} for ${actualDmg} shadow damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#a855f7", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#7e22ce", 1.2, 0.4);
      }
    });
  }
}

export class Corruption extends Ability {
  id = "corruption";
  name = "Corruption";
  icon = "Skull";
  castTime = 0;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 50 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    // Deals damage instantly, and registers an instant DoT tick. In this simplified system, we will deal instant medium damage and spawn corruption circle
    const isCrit = Math.random() < caster.stats.spellCrit;
    const damage = isCrit ? 60 : 35;
    const actualDmg = target.takeDamage(damage, caster, "shadow_dot");

    simulation.log(`${caster.name} curses ${target.name} with Corruption dealing ${actualDmg} shadow damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#c084fc", false);
    simulation.spawnVisualEffect("aoe", target.position, undefined, "#701a75", 1.5, 0.6);
  }
}

// 7. Paladin Abilities

export class Judgment extends Ability {
  id = "judgment";
  name = "Judgment";
  icon = "Sun";
  castTime = 0;
  cooldown = 8;
  range = 30;
  cost = { resource: "mana" as const, amount: 60 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    // Immediate holy projectile strike from above!
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 50 + Math.floor(Math.random() * 15);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    
    // Spawn effect from above
    const strikeStart = target.position.clone().add(new THREE.Vector3(0, 8, 0));
    simulation.spawnProjectile({
      start: strikeStart,
      target: target,
      speed: 40,
      color: "#fbbf24",
      size: 0.4,
      onHit: () => {
        const actualDmg = target.takeDamage(damage, caster, "holy");
        simulation.log(`${caster.name}'s Judgment strikes ${target.name} for ${actualDmg} damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#fbbf24", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#f59e0b", 1.5, 0.4);
      }
    });
  }
}

export class FlashOfLight extends Ability {
  id = "flash_of_light";
  name = "Flash of Light";
  icon = "Heart";
  castTime = 1.5;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 70 };
  requiresTarget = true;
  requiresHostile = false;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseHeal = 50 + Math.floor(Math.random() * 15);
    const healVal = isCrit ? baseHeal * 2 : baseHeal;
    const actualHeal = target.heal(healVal, caster);

    simulation.log(`${caster.name} casts Flash of Light on ${target.name} for ${actualHeal} health!`);
    simulation.spawnFloatingText(`+${actualHeal}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#10b981", isCrit);
    simulation.spawnVisualEffect("heal_burst", target.position, undefined, "#34d399", 1.2, 0.4);
  }
}

// 8. Shaman Abilities

export class LightningBolt extends Ability {
  id = "lightning_bolt";
  name = "Lightning Bolt";
  icon = "Zap";
  castTime = 2.0;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 70 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 30,
      color: "#22d3ee",
      size: 0.25,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 60 + Math.floor(Math.random() * 20);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "nature");

        simulation.log(`${caster.name}'s Lightning Bolt shocks ${target.name} for ${actualDmg} nature damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#22d3ee", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#0891b2", 1.2, 0.4);
      }
    });
  }
}

export class HealingSurge extends Ability {
  id = "healing_surge";
  name = "Healing Surge";
  icon = "Droplet";
  castTime = 1.5;
  cooldown = 0;
  range = 40;
  cost = { resource: "mana" as const, amount: 85 };
  requiresTarget = true;
  requiresHostile = false;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseHeal = 65 + Math.floor(Math.random() * 20);
    const healVal = isCrit ? baseHeal * 2 : baseHeal;
    const actualHeal = target.heal(healVal, caster);

    simulation.log(`${caster.name} channels Healing Surge into ${target.name} for ${actualHeal} health!`);
    simulation.spawnFloatingText(`+${actualHeal}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#10b981", isCrit);
    simulation.spawnVisualEffect("heal_burst", target.position, undefined, "#22d3ee", 1.5, 0.5);
  }
}

// 9. Boss Abilities

export class BossSmash extends Ability {
  id = "boss_smash";
  name = "Boss Smash";
  icon = "Skull";
  castTime = 1.0;
  cooldown = 6;
  range = 6;
  cost = { resource: "mana" as const, amount: 0 };
  requiresTarget = true;
  requiresHostile = true;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.6);
    
    // Massive single target hit
    const damage = 40 + Math.floor(Math.random() * 20);
    const actualDmg = target.takeDamage(damage, caster, "melee");

    simulation.log(`${caster.name} SMASHES ${target.name} for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#dc2626", true);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#dc2626", 2.0, 0.6);
  }
}

export class BossFireRain extends Ability {
  id = "boss_fire_rain";
  name = "Rain of Fire";
  icon = "Flame";
  castTime = 2.5;
  cooldown = 14;
  range = 50;
  cost = { resource: "mana" as const, amount: 0 };
  requiresTarget = false;
  requiresHostile = false;

  execute(caster: Actor, target: Actor | null, simulation: any) {
    simulation.log(`${caster.name} begins casting Rain of Fire! Watch your step!`);
    
    // Choose 3 random positions in the arena near players to spawn damage zones
    const playerActors: Actor[] = simulation.actors.filter((a: Actor) => a.faction === "player" && a.health > 0);
    playerActors.forEach((player) => {
      // Create a static ground fire circle centered on the player's current position
      const centerPos = player.position.clone();
      simulation.spawnDangerZone(centerPos, 4.0, 4.0, 45, caster); // 4m radius, 4.0s duration, 45 damage per tick or on end
    });
  }
}

// Map each class to their list of available abilities
export function getClassAbilities(cls: string): Ability[] {
  switch (cls.toLowerCase()) {
    case "warrior":
      return [new MortalStrike(), new Charge()];
    case "priest":
      return [new Smite(), new FlashHeal()];
    case "hunter":
      return [new SteadyShot(), new ArcaneShot()];
    case "rogue":
      return [new SinisterStrike(), new Eviscerate()];
    case "mage":
      return [new Fireball(), new Blink()];
    case "warlock":
      return [new ShadowBolt(), new Corruption()];
    case "paladin":
      return [new Judgment(), new FlashOfLight()];
    case "shaman":
      return [new LightningBolt(), new HealingSurge()];
    case "boss":
      return [new BossSmash(), new BossFireRain()];
    default:
      return [];
  }
}
