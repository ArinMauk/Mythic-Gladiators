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

  update(deltaTime: number) {
    if (this.isDead) return;
    if (this.target.health <= 0) {
      this.isDead = true;
      return;
    }

    // Aim slightly above ground, where actor torso is (approx y = 1.0)
    const targetPos = this.target.position.clone().add(new THREE.Vector3(0, 1.0, 0));
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
