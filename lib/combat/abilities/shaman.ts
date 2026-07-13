import * as THREE from "three";
import { Actor } from "../actor";

export const shamanExecutors = {
  lightning_bolt: (caster: Actor, target: Actor | null, simulation: any) => {
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
  },

  healing_surge: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseHeal = 65 + Math.floor(Math.random() * 20);
    const healVal = isCrit ? baseHeal * 2 : baseHeal;
    const actualHeal = target.heal(healVal, caster);

    simulation.log(`${caster.name} channels Healing Surge into ${target.name} for ${actualHeal} health!`);
    simulation.spawnFloatingText(`+${actualHeal}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#10b981", isCrit);
    simulation.spawnVisualEffect("heal_burst", target.position, undefined, "#22d3ee", 1.5, 0.5);
  }
};
