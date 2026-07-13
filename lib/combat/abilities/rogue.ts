import * as THREE from "three";
import { Actor } from "../actor";

export const rogueExecutors = {
  sinister_strike: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.3);
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 35 + Math.floor(Math.random() * 10);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");

    simulation.log(`${caster.name} performs Sinister Strike on ${target.name} for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#facc15", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#eab308", 0.8, 0.25);
  },

  eviscerate: (caster: Actor, target: Actor | null, simulation: any) => {
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
};
