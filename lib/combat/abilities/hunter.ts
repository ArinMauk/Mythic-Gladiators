import * as THREE from "three";
import { Actor } from "../actor";

export const hunterExecutors = {
  steady_shot: (caster: Actor, target: Actor | null, simulation: any) => {
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
  },

  arcane_shot: (caster: Actor, target: Actor | null, simulation: any) => {
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
};
