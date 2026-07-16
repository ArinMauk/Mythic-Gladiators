import * as THREE from "three";
import { Actor } from "../actor";

export const warriorExecutors = {
  mortal_strike: (caster: Actor, target: Actor | null, simulation: any) => {
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
  },

  charge: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    const distance = caster.position.distanceTo(target.position);
    if (distance < 6) return; // Charge has a min range of 6m

    // Instantly charge caster to target position
    const dir = target.position.clone().sub(caster.position).normalize();
    caster.position.copy(target.position).addScaledVector(dir, -2.5); // position behind target slightly
    simulation.resolveCollisions(caster);
    caster.addResource("rage", 20); // generates 20 rage

    simulation.log(`${caster.name} charges at ${target.name} and gains 20 Rage!`);
    simulation.spawnFloatingText("+20 Rage", caster.position.clone().add(new THREE.Vector3(0, 1.8, 0)), "#ef4444", false);
    simulation.spawnVisualEffect("aoe", caster.position, undefined, "#f97316", 2.0, 0.5);
  }
};
