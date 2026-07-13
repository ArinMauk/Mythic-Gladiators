import * as THREE from "three";
import { Actor } from "../actor";

export const bossExecutors = {
  boss_smash: (caster: Actor, target: Actor | null, simulation: any) => {
    if (!target) return;
    caster.setAnimState("attack_melee", 0.6);
    
    // Massive single target hit
    const damage = 40 + Math.floor(Math.random() * 20);
    const actualDmg = target.takeDamage(damage, caster, "melee");

    simulation.log(`${caster.name} SMASHES ${target.name} for ${actualDmg} damage!`);
    simulation.spawnFloatingText(`${actualDmg}`, target.position.clone().add(new THREE.Vector3(0, 1.5, 0)), "#dc2626", true);
    simulation.spawnVisualEffect("damage_burst", target.position, undefined, "#dc2626", 2.0, 0.6);
  },

  boss_fire_rain: (caster: Actor, target: Actor | null, simulation: any) => {
    simulation.log(`${caster.name} begins casting Rain of Fire! Watch your step!`);
    
    // Choose random positions near players of opposite faction to spawn danger zones
    // Wait, let's filter player faction to make sure we hit players/companions
    const playerActors: Actor[] = simulation.actors.filter((a: Actor) => a.faction === "player" && a.health > 0);
    playerActors.forEach((player) => {
      // Create a static ground fire circle centered on the player's current position
      const centerPos = player.position.clone();
      simulation.spawnDangerZone(centerPos, 4.0, 4.0, 45, caster); // 4m radius, 4.0s duration, 45 damage per tick or on end
    });
  }
};
