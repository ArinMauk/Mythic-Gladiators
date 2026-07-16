import * as THREE from "three";
import { Actor } from "./actor";
import { SkillCost } from "./types";

import classesData from "./data/classes.json";
import abilitiesData from "./data/abilities.json";

import { warriorExecutors } from "./abilities/warrior";
import { priestExecutors } from "./abilities/priest";
import { hunterExecutors } from "./abilities/hunter";
import { rogueExecutors } from "./abilities/rogue";
import { mageExecutors } from "./abilities/mage";
import { warlockExecutors } from "./abilities/warlock";
import { paladinExecutors } from "./abilities/paladin";
import { shamanExecutors } from "./abilities/shaman";
import { bossExecutors } from "./abilities/boss";

const executors: Record<string, (caster: Actor, target: Actor | null, simulation: any) => void> = {
  ...warriorExecutors,
  ...priestExecutors,
  ...hunterExecutors,
  ...rogueExecutors,
  ...mageExecutors,
  ...warlockExecutors,
  ...paladinExecutors,
  ...shamanExecutors,
  ...bossExecutors
};

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
  canCast(caster: Actor, target: Actor | null, simulation?: any): boolean {
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

      // Line of Sight check
      if (simulation && simulation.checkLineOfSight) {
        if (!simulation.checkLineOfSight(caster.position, target.position)) {
          return false;
        }
      }
    }
    return true;
  }

  // Cast Phase
  startCast(caster: Actor, target: Actor | null, simulation: any) {
    if (!this.canCast(caster, target, simulation)) {
      if (caster.isUser && target && simulation.checkLineOfSight && !simulation.checkLineOfSight(caster.position, target.position)) {
        simulation.log("Target is not in line of sight!");
      }
      return;
    }
    
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

export class CustomAbility extends Ability {
  id: string;
  name: string;
  icon: string;
  castTime: number;
  cooldown: number;
  range: number;
  cost: SkillCost;

  constructor(id: string, config: any) {
    super();
    this.id = id;
    this.name = config.name;
    this.icon = config.icon;
    this.castTime = config.castTime;
    this.cooldown = config.cooldown;
    this.range = config.range;
    this.cost = config.cost;
    this.requiresTarget = config.requiresTarget ?? true;
    this.requiresHostile = config.requiresHostile ?? true;
  }

  execute(caster: Actor, target: Actor | null, simulation: any): void {
    const executor = executors[this.id];
    if (executor) {
      executor(caster, target, simulation);
    }
  }
}

// Map each class to their list of available abilities
export function getClassAbilities(cls: string): Ability[] {
  const classKey = cls.toLowerCase();
  const classConf = (classesData as any)[classKey];
  if (!classConf || !classConf.abilities) return [];

  return classConf.abilities.map((abilityId: string) => {
    const abConf = (abilitiesData as any)[abilityId];
    if (!abConf) {
      throw new Error(`Ability data not found for ID: ${abilityId}`);
    }
    return new CustomAbility(abilityId, abConf);
  });
}
