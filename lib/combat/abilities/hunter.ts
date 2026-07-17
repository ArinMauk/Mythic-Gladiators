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
  },

  aimed_shot: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 35,
      color: "#16a34a",
      size: 0.3,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 110 + Math.floor(Math.random() * 30);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "physical");

        simulation.log(`${caster.name}'s Aimed Shot hits ${target.name} for ${actualDmg} physical damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#16a34a", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#16a34a", 1.2, 0.4);
      }
    });
  },

  kill_command: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 40,
      color: "#b45309",
      size: 0.25,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 75 + Math.floor(Math.random() * 20);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "physical");

        simulation.log(`${caster.name}'s Kill Command strikes ${target.name} for ${actualDmg} pet physical damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#b45309", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#ea580c", 1.4, 0.4);
      }
    });
  },

  explosive_shot: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    simulation.spawnProjectile({
      start: caster.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
      target: target,
      speed: 35,
      color: "#ea580c",
      size: 0.25,
      onHit: () => {
        const isCrit = Math.random() < caster.stats.spellCrit;
        const baseDamage = 60 + Math.floor(Math.random() * 15);
        const damage = isCrit ? baseDamage * 2 : baseDamage;
        const actualDmg = target.takeDamage(damage, caster, "fire");

        simulation.log(`${caster.name}'s Explosive Shot blows up on ${target.name} for ${actualDmg} fire damage!`);
        simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#ea580c", isCrit);
        simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#ea580c", 1.5, 0.5);
      }
    });
  }
};
