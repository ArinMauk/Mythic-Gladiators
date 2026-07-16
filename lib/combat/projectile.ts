import * as THREE from "three";
import { Actor } from "./actor";

export interface ProjectileConfig {
  id: string;
  start: THREE.Vector3;
  target: Actor;
  speed: number;
  color: string;
  size: number;
  onHit: () => void;
}

export class Projectile {
  id: string;
  position: THREE.Vector3;
  target: Actor;
  speed: number;
  color: string;
  size: number;
  onHit: () => void;
  isDead: boolean = false;

  constructor(config: ProjectileConfig) {
    this.id = config.id;
    this.position = config.start.clone();
    this.target = config.target;
    this.speed = config.speed;
    this.color = config.color;
    this.size = config.size;
    this.onHit = config.onHit;
  }

  update(deltaTime: number, simulation?: any) {
    if (this.isDead) return;
    if (this.target.health <= 0) {
      this.isDead = true;
      return;
    }

    // Check if projectile intersects any obstacle along its horizontal path
    if (simulation && simulation.obstacles) {
      for (const obs of simulation.obstacles) {
        // Since projectiles are 3D, but pillars are tall cylinders, we can check 2D circle intersection on xz plane
        const dx = this.position.x - obs.position.x;
        const dz = this.position.z - obs.position.z;
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        
        // Check if projectile hits the pillar boundary (obstacle radius + projectile size buffer)
        if (dist2D < obs.radius + this.size) {
          // Projectile hit the obstacle!
          simulation.log(`A projectile hit a pillar and dissipated!`);
          simulation.spawnVisualEffect("damage_burst", this.position.clone(), undefined, this.color, this.size * 2, 0.4);
          this.isDead = true;
          return;
        }
      }
    }

    // Aim slightly above ground, where actor torso is (approx y = 1.0 for standard characters, 2.5 for Boss)
    const torsoHeight = this.target.class === "boss" ? 2.5 : 1.0;
    const targetPos = this.target.position.clone().add(new THREE.Vector3(0, torsoHeight, 0));
    const dir = targetPos.clone().sub(this.position);
    const dist = dir.length();
    const moveDist = this.speed * deltaTime;

    if (dist <= moveDist) {
      this.position.copy(targetPos);
      this.onHit();
      this.isDead = true;
    } else {
      dir.normalize();
      this.position.addScaledVector(dir, moveDist);
    }
  }
}
