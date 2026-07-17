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
  },

  holy_shock: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    const isFriendly = target.faction === caster.faction;
    const isCrit = Math.random() < caster.stats.spellCrit;
    
    if (isFriendly) {
      // Heal ally
      const baseHeal = 55 + Math.floor(Math.random() * 15);
      const healVal = isCrit ? baseHeal * 2 : baseHeal;
      const actualHeal = target.heal(healVal, caster);

      simulation.log(`${caster.name} shocks ${target.name} with Holy Shock healing for ${actualHeal}!`);
      simulation.spawnFloatingText(`+${actualHeal}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#10b981", isCrit);
      simulation.spawnVisualEffect("heal_burst", target.position, undefined, "#34d399", 1.2, 0.4);
    } else {
      // Strike enemy
      const baseDamage = 55 + Math.floor(Math.random() * 15);
      const damage = isCrit ? baseDamage * 2 : baseDamage;
      const actualDmg = target.takeDamage(damage, caster, "holy");

      simulation.log(`${caster.name}'s Holy Shock deals ${actualDmg} holy damage to ${target.name}!`);
      simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#fbbf24", isCrit);
      simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#fbbf24", 1.2, 0.3);
    }
  },

  shield_of_the_righteous: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.4);
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 45 + Math.floor(Math.random() * 15);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "physical");
    
    // Add 50 absorb shield to caster
    caster.shield = (caster.shield || 0) + 50;

    simulation.log(`${caster.name} slams ${target.name} with Shield of the Righteous for ${actualDmg} damage and gains 50 Shield absorb!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#fbbf24", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#f59e0b", 1.2, 0.4);
    simulation.spawnVisualEffect("heal_burst", caster.position, undefined, "#fbbf24", 1.0, 0.3);
  },

  templars_verdict: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.4);
    const isCrit = Math.random() < caster.stats.spellCrit;
    const baseDamage = 90 + Math.floor(Math.random() * 25);
    const damage = isCrit ? baseDamage * 2 : baseDamage;
    const actualDmg = target.takeDamage(damage, caster, "holy");

    simulation.log(`${caster.name} executes Templar's Verdict on ${target.name} dealing ${actualDmg} massive holy damage!`);
    simulation.spawnFloatingText(`${actualDmg}!`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#fbbf24", isCrit);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#fbbf24", 1.6, 0.4);
  }
};
