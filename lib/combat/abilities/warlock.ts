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
  }
};
