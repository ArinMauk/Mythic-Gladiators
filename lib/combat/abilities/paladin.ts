import * as THREE from "three";
import { Actor } from "../actor";

export const paladinExecutors = {
  judgment: (caster: Actor, target: Actor | null, simulation: any) => {
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
  },

  flash_of_light: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseHeal = 50 + Math.floor(Math.random() * 15);
    const healVal = isCrit ? baseHeal * 2 : baseHeal;
    const actualHeal = target.heal(healVal, caster);

    simulation.log(`${caster.name} casts Flash of Light on ${target.name} for ${actualHeal} health!`);
    simulation.spawnFloatingText(`+${actualHeal}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#10b981", isCrit);
    simulation.spawnVisualEffect("heal_burst", target.position, undefined, "#34d399", 1.2, 0.4);
  }
};
