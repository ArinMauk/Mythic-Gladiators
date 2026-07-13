import * as THREE from "three";
import { GameClass, Faction, Role, ResourceType, ActorStats } from "./types";
import classesData from "./data/classes.json";

export class Actor {
  id: string;
  name: string;
  class: GameClass;
  faction: Faction;
  role: Role;
  position: THREE.Vector3;
  velocity: THREE.Vector3 = new THREE.Vector3();
  yaw: number = 0; // rotation around Y axis in radians
  target: Actor | null = null;

  health: number;
  maxHealth: number;
  shield: number = 0;

  resources: Record<ResourceType, number>;
  maxResources: Record<ResourceType, number>;

  stats: ActorStats;
  cooldowns: Map<string, number> = new Map();
  gcdRemaining: number = 0;

  isCasting: boolean = false;
  castName: string = "";
  castTimeTotal: number = 0;
  castTimeRemaining: number = 0;
  castCallback: (() => void) | null = null;

  animState: "idle" | "walk" | "run" | "jump" | "attack_melee" | "cast" | "get_hit" | "die" = "idle";
  threatMap: Map<string, number> = new Map(); // tracks player threat (threat on boss)
  isUser: boolean = false;

  // Track state duration for animations
  animTimer: number = 0;

  constructor(
    id: string,
    name: string,
    cls: GameClass,
    faction: Faction,
    role: Role,
    initialPos: THREE.Vector3,
    isUser: boolean = false
  ) {
    this.id = id;
    this.name = name;
    this.class = cls;
    this.faction = faction;
    this.role = role;
    this.position = initialPos.clone();
    this.isUser = isUser;

    // Set stats and max health/resource based on class data
    const classKey = cls.toLowerCase();
    const classConf = (classesData as any)[classKey];
    if (!classConf) {
      throw new Error(`Class config not found for: ${cls}`);
    }

    this.stats = {
      speed: classConf.speed,
      spellCrit: classConf.spellCrit,
      armor: classConf.armor,
    };

    this.maxHealth = classConf.maxHealth;
    this.health = this.maxHealth;

    this.resources = { mana: 0, energy: 0, rage: 0, focus: 0 };
    this.maxResources = { mana: 0, energy: 0, rage: 0, focus: 0 };

    if (classConf.resourceType) {
      const resType = classConf.resourceType as ResourceType;
      this.maxResources[resType] = classConf.maxResource;
      this.resources[resType] = classConf.initialResource;
    }
  }

  currentResource(res: ResourceType): number {
    return this.resources[res];
  }

  spendResource(res: ResourceType, amount: number) {
    this.resources[res] = Math.max(0, this.resources[res] - amount);
  }

  addResource(res: ResourceType, amount: number) {
    this.resources[res] = Math.min(this.maxResources[res], this.resources[res] + amount);
  }

  isGCDActive(): boolean {
    return this.gcdRemaining > 0;
  }

  triggerGCD(duration: number = 1.5) {
    this.gcdRemaining = duration;
  }

  startCastTimer(name: string, duration: number, callback: () => void) {
    // Check if moving - cannot cast while moving
    if (this.velocity.lengthSq() > 0.01) {
      return;
    }
    this.isCasting = true;
    this.castName = name;
    this.castTimeTotal = duration;
    this.castTimeRemaining = duration;
    this.castCallback = callback;
    this.setAnimState("cast");
  }

  interruptCast() {
    if (this.isCasting) {
      this.isCasting = false;
      this.castCallback = null;
      this.setAnimState("idle");
    }
  }

  triggerCooldown(abilityId: string, duration: number) {
    this.cooldowns.set(abilityId, duration);
  }

  getCooldown(abilityId: string): number {
    return this.cooldowns.get(abilityId) || 0;
  }

  takeDamage(amount: number, attacker: Actor, type: string): number {
    if (this.health <= 0) return 0;

    // Apply armor reduction for physical damage types
    let damage = amount;
    const isPhysical = type === "physical" || type === "melee" || type === "crit";
    if (isPhysical) {
      const reduction = this.stats.armor / (this.stats.armor + 400); // WoW style armor reduction formula
      damage = Math.floor(damage * (1 - reduction));
    }

    // Apply shield
    if (this.shield > 0) {
      if (this.shield >= damage) {
        this.shield -= damage;
        damage = 0;
      } else {
        damage -= this.shield;
        this.shield = 0;
      }
    }

    if (damage <= 0) return 0;

    this.health = Math.max(0, this.health - damage);

    // If warrior, generate rage when taking damage
    if (this.class === "warrior") {
      this.addResource("rage", Math.floor(damage * 0.15));
    }

    // Track threat
    if (this.class === "boss") {
      const currentThreat = this.threatMap.get(attacker.id) || 0;
      // Healers might generate threat elsewhere, but for simplicity, threat is damage-based
      const modifier = attacker.role === "tank" ? 3.0 : 1.0; // Tanks have high threat modifier
      this.threatMap.set(attacker.id, currentThreat + damage * modifier);
    }

    if (this.health <= 0) {
      this.setAnimState("die");
    } else {
      this.setAnimState("get_hit", 0.3);
    }

    return damage;
  }

  heal(amount: number, healer: Actor): number {
    if (this.health <= 0) return 0;
    const actualHeal = Math.min(this.maxHealth - this.health, amount);
    this.health += actualHeal;

    // Healers generate threat on the boss when healing party members
    if (this.class !== "boss" && actualHeal > 0) {
      // Find boss in environment (managed by simulation) and add threat
    }

    return actualHeal;
  }

  setAnimState(state: typeof this.animState, duration: number = 0) {
    if (this.animState === "die") return; // cannot overwrite death anim
    if (this.animState === state && duration === 0) return;

    this.animState = state;
    this.animTimer = duration; // if duration > 0, state is temporary
  }

  update(deltaTime: number, simulationBoss: Actor | null = null) {
    if (this.health <= 0) {
      this.animState = "die";
      return;
    }

    // Cooldown reductions
    for (const [key, val] of this.cooldowns.entries()) {
      if (val <= deltaTime) {
        this.cooldowns.delete(key);
      } else {
        this.cooldowns.set(key, val - deltaTime);
      }
    }

    // GCD countdown
    if (this.gcdRemaining > 0) {
      this.gcdRemaining = Math.max(0, this.gcdRemaining - deltaTime);
    }

    // Resource regeneration
    if (this.class === "rogue") {
      this.addResource("energy", 12 * deltaTime); // energy regen
    } else if (this.class === "hunter") {
      this.addResource("focus", 7 * deltaTime); // focus regen
    } else if (this.class === "warrior") {
      // Warrior rage slowly decays if out of combat (or stays 0)
      if (!this.target) {
        this.spendResource("rage", 2 * deltaTime);
      }
    } else if (this.class !== "boss") {
      // Mana classes
      this.addResource("mana", 15 * deltaTime);
    } else {
      // Boss
      this.addResource("mana", 20 * deltaTime);
    }

    // Anim timer countdown
    if (this.animTimer > 0) {
      this.animTimer -= deltaTime;
      if (this.animTimer <= 0) {
        // Return to standard movement animation
        if (this.velocity.lengthSq() > 0.05) {
          this.setAnimState("run");
        } else {
          this.setAnimState("idle");
        }
      }
    }

    // Update cast timer
    if (this.isCasting) {
      // Rotate to face the target if we have one
      if (this.target) {
        this.yaw = Math.atan2(this.target.position.x - this.position.x, this.target.position.z - this.position.z);
      }
      
      // If actor started moving, interrupt cast!
      if (this.velocity.lengthSq() > 0.01) {
        this.interruptCast();
      } else {
        this.castTimeRemaining -= deltaTime;
        if (this.castTimeRemaining <= 0) {
          if (this.castCallback) {
            this.castCallback();
          }
          this.isCasting = false;
          this.castCallback = null;
          this.setAnimState("idle");
          this.triggerGCD();
        }
      }
    }

    // Handle temporary animations like attack/hit
    if (this.animState !== "die" && this.animState !== "get_hit" && this.animState !== "attack_melee" && this.animState !== "cast") {
      if (this.velocity.lengthSq() > 0.05) {
        this.setAnimState("run");
      } else {
        this.setAnimState("idle");
      }
    }

    // Apply movement
    this.position.addScaledVector(this.velocity, deltaTime);

    // Clamp boundary in a circle of 40m radius centered at (0,0) (the Arena floor)
    const distanceFromCenter = Math.sqrt(this.position.x * this.position.x + this.position.z * this.position.z);
    if (distanceFromCenter > 38) {
      this.position.setLength(38);
    }

    // Maintain height on the flat ground floor
    this.position.y = 0;

    // Boss threat generation for healer
    if (simulationBoss && this.class !== "boss" && this.health > 0) {
      // If we are a healer and healing, we generate threat. The simulation handles applying healing threat to boss.
    }
  }
}
