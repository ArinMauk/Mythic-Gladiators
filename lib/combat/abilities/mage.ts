import * as THREE from "three";
import { Actor } from "../actor";

export const mageExecutors = {
  fireball: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 25,
      color: "#f97316",
      size: 0.35,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 70 + Math.floor(Math.random() * 20);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, isCrit ? "fire_crit" : "fire");

        simulation.log(`${caster.name}'s Fireball bursts on ${target.name} for ${actualDmg} damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#f97316", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#ea580c", 1.5, 0.5);
      }
    });
  },

  blink: (caster: Actor, target: Actor | null, simulation: any) => {
    // Leap forward in current direction (defined by yaw angle)
    const forward = new THREE.Vector3(Math.sin(caster.yaw), 0, Math.cos(caster.yaw)).normalize();
    
    // Spawn effect at original position
    simulation.spawnVisualEffect("aoe", caster.position.clone(), undefined, "#3b82f6", 1.5, 0.4);
    
    caster.position.addScaledVector(forward, 15);
    // Clamp boundaries
    const dst = Math.sqrt(caster.position.x * caster.position.x + caster.position.z * caster.position.z);
    if (dst > 38) {
      caster.position.setLength(38);
    }
    simulation.resolveCollisions(caster);
    
    simulation.log(`${caster.name} blinks forward 15 meters!`);
    simulation.spawnVisualEffect("aoe", caster.position.clone(), undefined, "#60a5fa", 1.5, 0.4);
  }
};
