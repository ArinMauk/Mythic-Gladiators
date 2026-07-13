import * as THREE from "three";
import { Actor } from "../actor";

export const priestExecutors = {
  smite: (caster: Actor, target: Actor | null, simulation: any) => {
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
  },

  flash_heal: (caster: Actor, target: Actor | null, simulation: any) => {
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
};
