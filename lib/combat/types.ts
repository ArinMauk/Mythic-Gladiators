import * as THREE from "three";

export type GameClass = "warrior" | "priest" | "hunter" | "rogue" | "mage" | "warlock" | "paladin" | "shaman" | "boss";
export type CompanionType = "ai" | "players";
export type GameMode = "pvp" | "pve";
export type Faction = "player" | "enemy";
export type Role = "tank" | "healer" | "damage";
export type ResourceType = "mana" | "energy" | "rage" | "focus";

export interface SkillCost {
  resource: ResourceType;
  amount: number;
}

export interface ActorStats {
  speed: number;
  spellCrit: number;
  armor: number;
}

export interface VisualEffect {
  id: string;
  type: "projectile" | "aoe" | "heal_burst" | "damage_burst";
  position: THREE.Vector3;
  targetPosition?: THREE.Vector3;
  color: string;
  size: number;
  duration: number;
  elapsed: number;
}

export interface FloatingText {
  id: string;
  text: string;
  position: THREE.Vector3;
  color: string;
  isCrit: boolean;
  duration: number;
  elapsed: number;
}
