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
  },

  mutilate: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.3);
    const isCrit = Math.random() < caster.stats.spellCrit + 0.1; // Mutilate has extra crit
    const baseDamage = 80 + Math.floor(Math.random() * 20);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");

    simulation.log(`${caster.name} MUTILATES ${target.name} for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}!`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#eab308", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#eab308", 1.2, 0.3);
  },

  adrenaline_rush: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.5);
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 70 + Math.floor(Math.random() * 20);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");

    simulation.log(`${caster.name} enters Adrenaline Rush and flurries ${target.name} for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#facc15", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#ea580c", 1.4, 0.4);
  },

  shadowstep: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    
    // Spawn effect at original position
    simulation.spawnVisualEffect("aoe", caster.position.clone(), undefined, "#7e22ce", 1.2, 0.3);
    
    // Teleport behind target
    const targetForward = new THREE.Vector3(Math.sin(target.yaw), 0, Math.cos(target.yaw)).normalize();
    caster.position.copy(target.position).addScaledVector(targetForward, -1.5);
    simulation.resolveCollisions(caster);
    caster.yaw = target.yaw; // face the same way as target

    // Shadow physical strike!
    const isCrit = Math.random() < caster.stats.spellCrit + 0.15;
    const baseDamage = 60 + Math.floor(Math.random() * 15);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");

    simulation.log(`${caster.name} shadowsteps behind ${target.name} and strikes for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#a855f7", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#7e22ce", 1.2, 0.4);
  }
};
