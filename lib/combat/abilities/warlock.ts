import * as THREE from "three";
import { Actor } from "../actor";

export const warlockExecutors = {
  shadow_bolt: (caster: Actor, target: Actor | null, simulation: any) => {
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
  },

  corruption: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    // Deals damage instantly, and registers an instant DoT tick. In this simplified system, we will deal instant medium damage and spawn corruption circle
    const isCrit = Math.random() < caster.stats.spellCrit;
    const damage = isCrit ? 60 : 35;
    const actualDmg = target.takeDamage(damage, caster, "shadow_dot");

    simulation.log(`${caster.name} curses ${target.name} with Corruption dealing ${actualDmg} shadow damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#c084fc", false);
    simulation.spawnVisualEffect("aoe", target.position, undefined, "#701a75", 1.5, 0.6);
  },

  unstable_affliction: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 55 + Math.floor(Math.random() * 15);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "shadow");

    simulation.log(`${caster.name} afflicts ${target.name} with Unstable Affliction for ${actualDmg} shadow damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#a855f7", isCrit);
    simulation.spawnVisualEffect("aoe", target.position, undefined, "#701a75", 1.2, 0.5);
  },

  hand_of_gul_dan: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    simulation.spawnProjectile({
      start: target.position.clone().add(new THREE.Vector3(0, 8, 0)), // Drop meteor from sky
      target: target,
      speed: 15,
      color: "#a855f7",
      size: 0.5,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 90 + Math.floor(Math.random() * 25);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "shadow");

        simulation.log(`${caster.name}'s Hand of Gul'dan calls a meteor onto ${target.name} for ${actualDmg} shadow damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#a855f7", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#a855f7", 1.8, 0.5);
      }
    });
  },

  chaos_bolt: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 25,
      color: "#22c55e", // Felt green chaotic bolt!
      size: 0.45,
      onHit: () => {
        // Chaos Bolt has a guaranteed critical strike in WoW!
        const baseDamage = 130 + Math.floor(Math.random() * 35);
        const damage = baseDamage * 2; // Always crit!
        const actualDmg = target.takeDamage(damage, caster, "chaos_crit");

        simulation.log(`${caster.name}'s CHAOS BOLT incinerates ${target.name} for ${actualDmg} chaos damage! (Critical!)`);
        simulation.spawnFloatingText(`${actualDmg}!`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#22c55e", true);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#22c55e", 2.0, 0.6);
      }
    });
  }
};
