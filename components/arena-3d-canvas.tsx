// @ts-nocheck
import React, { useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { CombatSimulation, DangerZone } from "@/lib/combat/simulation";
import { Actor } from "@/lib/combat/actor";
import { Projectile } from "@/lib/combat/projectile";
import { VisualEffect, FloatingText, GameClass } from "@/lib/combat/types";
import {
  Shield,
  Heart,
  Crosshair,
  BadgeX as Dagger,
  Flame,
  Skull,
  Sun,
  Sparkles,
} from "lucide-react";

interface Arena3DCanvasProps {
  simulation: CombatSimulation;
  onSelectTarget: (actor: Actor | null) => void;
}

const classColors: Record<string, string> = {
  warrior: "#f59e0b",
  priest: "#10b981",
  hunter: "#22c55e",
  rogue: "#eab308",
  mage: "#3b82f6",
  warlock: "#a855f7",
  paladin: "#fbbf24",
  shaman: "#06b6d4",
  boss: "#ef4444",
};

const classIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  warrior: Shield,
  priest: Heart,
  hunter: Crosshair,
  rogue: Dagger,
  mage: Flame,
  warlock: Skull,
  paladin: Sun,
  shaman: Sparkles,
};

// 1. Scene Controller & Camera Follow Rig
function CameraRig({ player, simulation, onSelectTarget }: { player: Actor; simulation: CombatSimulation; onSelectTarget: (actor: Actor | null) => void }) {
  const { camera, gl } = useThree();
  
  // Camera state
  const camRadiusRef = useRef<number>(14);
  const camThetaRef = useRef<number>(Math.PI); // Horizontal angle (around Y)
  const camPhiRef = useRef<number>(Math.PI / 5);  // Vertical angle (pitch)
  
  // Input tracking
  const keysPressed = useRef<Record<string, boolean>>({});
  const mouseState = useRef({ isLeftDown: false, isRightDown: false, lastX: 0, lastY: 0 });

  useEffect(() => {
    // 1. Keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = true;

      // Tab target with index-by-index cycling of alive enemies
      if (e.key === "Tab") {
        e.preventDefault();
        const aliveEnemies = simulation.actors.filter(a => a.faction === "enemy" && a.health > 0);
        if (aliveEnemies.length > 0) {
          let nextIndex = 0;
          if (player.target) {
            const currentIndex = aliveEnemies.findIndex(e => e.id === player.target?.id);
            if (currentIndex !== -1) {
              nextIndex = (currentIndex + 1) % aliveEnemies.length;
            }
          }
          player.target = aliveEnemies[nextIndex];
          onSelectTarget(aliveEnemies[nextIndex]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current[key] = false;
    };

    // 2. Mouse listeners
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) mouseState.current.isLeftDown = true;
      if (e.button === 2) mouseState.current.isRightDown = true;
      mouseState.current.lastX = e.clientX;
      mouseState.current.lastY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - mouseState.current.lastX;
      const deltaY = e.clientY - mouseState.current.lastY;
      mouseState.current.lastX = e.clientX;
      mouseState.current.lastY = e.clientY;

      const sensitivity = 0.005;

      if (mouseState.current.isLeftDown || mouseState.current.isRightDown) {
        // Rotate camera
        camThetaRef.current -= deltaX * sensitivity;
        camPhiRef.current = Math.max(0.05, Math.min(Math.PI / 2.2, camPhiRef.current + deltaY * sensitivity));
        
        // If right click is dragging, also steer character yaw to match camera theta
        if (mouseState.current.isRightDown) {
          player.yaw = camThetaRef.current;
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseState.current.isLeftDown = false;
      if (e.button === 2) mouseState.current.isRightDown = false;
    };

    const handleWheel = (e: WheelEvent) => {
      camRadiusRef.current = Math.max(3, Math.min(32, camRadiusRef.current + e.deltaY * 0.015));
    };

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    gl.domElement.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    gl.domElement.addEventListener("wheel", handleWheel);
    gl.domElement.addEventListener("contextmenu", preventContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      gl.domElement.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      gl.domElement.removeEventListener("wheel", handleWheel);
      gl.domElement.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [gl, player, simulation, onSelectTarget]);

  useFrame((state, delta) => {
    // 2. Position camera relative to player position
    const radius = camRadiusRef.current;
    const theta = camThetaRef.current;
    const phi = camPhiRef.current;

    // Calculate movement directions relative to camera theta (camera horizontal angle)
    // When looking at character from behind, theta defaults to Math.PI (which faces forward relative to screen)
    const forward = new THREE.Vector3(-Math.sin(theta), 0, -Math.cos(theta)).normalize();
    const right = new THREE.Vector3(-Math.cos(theta), 0, Math.sin(theta)).normalize();

    // 1. Process player movement inputs
    const move = new THREE.Vector3();
    const keys = keysPressed.current;
    if (keys["w"] || keys["arrowup"]) move.add(forward);
    if (keys["s"] || keys["arrowdown"]) move.add(forward.clone().negate());
    if (keys["a"]) move.add(right);                  // Flipped: A goes left, D goes right relative to camera
    if (keys["d"]) move.add(right.clone().negate()); // Flipped: D goes right, A goes left relative to camera

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(player.stats.speed);
      player.velocity.copy(move);

      // WoW-style orientation:
      // If right click dragging, lock character facing (yaw) with camera angle (theta)
      if (mouseState.current.isRightDown) {
        player.yaw = theta;
      } else {
        // If left-click looking or free camera, orient character facing in direction of movement
        player.yaw = Math.atan2(move.x, move.z);
      }
    } else {
      player.velocity.set(0, 0, 0);

      // Even when stationary, align player yaw with camera theta if right click is down
      if (mouseState.current.isRightDown) {
        player.yaw = theta;
      }
    }

    const camOffset = new THREE.Vector3(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(phi),
      radius * Math.cos(theta) * Math.cos(phi)
    );

    const cameraTarget = player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    camera.position.copy(player.position).add(camOffset);
    camera.lookAt(cameraTarget);
  });

  return null;
}

// 2. Single Actor 3D Component
interface ActorMeshProps {
  actor: Actor;
  isTargeted: boolean;
  onSelect: () => void;
}

function ActorMesh({ actor, isTargeted, onSelect }: ActorMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Group>(null);
  const color = classColors[actor.class] || "#ffffff";
  const sizeMultiplier = actor.class === "boss" ? 2.5 : 1.0;
  
  // Bobbing animation for movement
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.copy(actor.position);
    }
    if (!meshRef.current) return;
    
    // Death rotation
    if (actor.health <= 0) {
      meshRef.current.rotation.z = Math.PI / 2;
      meshRef.current.position.y = -0.4;
      return;
    }

    meshRef.current.position.y = 0;
    meshRef.current.rotation.z = 0;

    // Yaw rotation
    meshRef.current.rotation.y = actor.yaw;

    // Movement bobs
    if (actor.velocity.lengthSq() > 0.05) {
      const bob = Math.sin(state.clock.getElapsedTime() * 12) * 0.15;
      meshRef.current.position.y = Math.abs(bob);
      // Lean forward slightly
      meshRef.current.rotation.x = 0.15;
    } else {
      meshRef.current.rotation.x = 0;
    }

    // Hit animation tilt
    if (actor.animState === "get_hit") {
      meshRef.current.rotation.x = -0.3;
    }

    // Casting raise animation
    if (actor.isCasting) {
      // gentle wobble
      meshRef.current.rotation.z = Math.sin(state.clock.getElapsedTime() * 15) * 0.05;
    }
  });

  const Icon = classIcons[actor.class] || Shield;

  return (
    <group ref={groupRef}>
      {/* Target Ring underneath */}
      {isTargeted && actor.health > 0 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[sizeMultiplier * 0.9, sizeMultiplier * 1.1, 32]} />
          <meshBasicMaterial color={actor.faction === "enemy" ? "#ef4444" : "#10b981"} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Main Body */}
      <group ref={meshRef}>
        <mesh position={[0, sizeMultiplier * 1.0, 0]} onClick={onSelect}>
          <capsuleGeometry args={[sizeMultiplier * 0.4, sizeMultiplier * 1.2, 8, 16]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
        </mesh>
        
        {/* Face indicator (so we know where it's looking) */}
        <mesh position={[0, sizeMultiplier * 1.6, sizeMultiplier * 0.35]} onClick={onSelect}>
          <boxGeometry args={[sizeMultiplier * 0.2, sizeMultiplier * 0.1, sizeMultiplier * 0.2]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>

        {/* Evil eyes for boss */}
        {actor.class === "boss" && (
          <>
            <mesh position={[-0.2, 1.7, 0.5]} onClick={onSelect}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0.2, 1.7, 0.5]} onClick={onSelect}>
              <sphereGeometry args={[0.07, 8, 8]} />
              <meshBasicMaterial color="#ef4444" />
            </mesh>
          </>
        )}
      </group>

      {/* Nameplate, Healthbar, Castbar Floating above head */}
      {actor.health > 0 && (
        <Html position={[0, sizeMultiplier * 2.5, 0]} center distanceFactor={14}>
          <div className="flex flex-col items-center pointer-events-none select-none">
            {/* Nameplate with class icon */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/70 border border-white/10 shadow-lg text-[10px] font-bold text-white">
              <Icon className="w-3 h-3" color={color} />
              <span className={actor.isUser ? "text-amber-400" : ""}>{actor.name}</span>
            </div>
            
            {/* Mini Health Bar */}
            <div className="w-20 h-1.5 mt-1 bg-black/80 rounded overflow-hidden border border-black shadow">
              <div 
                className="h-full bg-emerald-500 rounded transition-all duration-100"
                style={{ width: `${(actor.health / actor.maxHealth) * 100}%` }}
              />
            </div>

            {/* Cast bar */}
            {actor.isCasting && (
              <div className="w-20 mt-1 px-1 bg-black/80 rounded border border-yellow-500/50 shadow flex flex-col items-center">
                <span className="text-[7px] text-yellow-300 font-bold truncate max-w-[76px] uppercase leading-none mt-0.5">
                  {actor.castName}
                </span>
                <div className="w-full h-1 mt-0.5 mb-0.5 bg-zinc-800 rounded overflow-hidden">
                  <div 
                    className="h-full bg-yellow-500 rounded"
                    style={{ width: `${(1 - actor.castTimeRemaining / actor.castTimeTotal) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// 3. Projectiles Component
function ProjectileMesh({ proj }: { proj: Projectile }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(proj.position);
    }
  });

  return (
    <mesh ref={meshRef} position={proj.position}>
      <sphereGeometry args={[proj.size, 16, 16]} />
      <meshBasicMaterial color={proj.color} />
    </mesh>
  );
}

// 4. Danger Zones
function DangerZoneMesh({ zone }: { zone: DangerZone }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[zone.position.x, 0.05, zone.position.z]}>
      <ringGeometry args={[zone.radius - 0.2, zone.radius, 64]} />
      <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}

// 5. Visual Effects Renderer
function VisualEffectMesh({ effect }: { effect: VisualEffect }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (!meshRef.current) return;
    const progress = effect.elapsed / effect.duration;
    
    if (effect.type === "heal_burst") {
      meshRef.current.scale.setScalar(1 + progress * effect.size);
    } else if (effect.type === "damage_burst") {
      meshRef.current.scale.setScalar(0.5 + progress * effect.size * 1.5);
    }
  });

  if (effect.type === "aoe") {
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[effect.position.x, 0.06, effect.position.z]}>
        <circleGeometry args={[effect.size, 32]} />
        <meshBasicMaterial color={effect.color} transparent opacity={0.2 * (1 - effect.elapsed / effect.duration)} side={THREE.DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} position={effect.position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshBasicMaterial color={effect.color} transparent opacity={0.8 * (1 - effect.elapsed / effect.duration)} />
    </mesh>
  );
}

// 6. Floating Text component
function FloatingTextMesh({ ft }: { ft: FloatingText }) {
  return (
    <Html position={ft.position} center>
      <div 
        className="font-black text-outline pointer-events-none select-none transition-all duration-75 leading-none"
        style={{
          color: ft.color,
          fontSize: ft.isCrit ? "22px" : "15px",
          transform: `scale(${ft.isCrit ? 1.4 : 1.0})`,
          opacity: 1 - ft.elapsed / ft.duration,
          whiteSpace: "nowrap",
          textShadow: "2px 2px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000, -2px 2px 0px #000"
        }}
      >
        {ft.text}
      </div>
    </Html>
  );
}

// Obstacle 3D Component (Pillars/Walls)
function ObstacleMesh({ obstacle }: { obstacle: any }) {
  return (
    <group position={[obstacle.position.x, 0, obstacle.position.z]}>
      {/* Pillar Base / Body */}
      <mesh position={[0, obstacle.height / 2, 0]}>
        <cylinderGeometry args={[obstacle.radius, obstacle.radius, obstacle.height, 16]} />
        <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.2} />
      </mesh>
      {/* Pillar Capital / Top */}
      <mesh position={[0, obstacle.height, 0]}>
        <cylinderGeometry args={[obstacle.radius * 1.15, obstacle.radius, 0.4, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.6} />
      </mesh>
      {/* Pillar Base trim */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[obstacle.radius * 1.1, obstacle.radius * 1.15, 0.4, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.8} />
      </mesh>
    </group>
  );
}

// 7. Arena World (Static Ground, Pillars, Lighting)
function ArenaWorld() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[10, 20, 10]} intensity={1.8} castShadow />

      {/* Arena Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <circleGeometry args={[40, 64]} />
        <meshStandardMaterial color="#1a1c24" roughness={0.8} />
      </mesh>

      {/* Floor grid */}
      <gridHelper args={[80, 40, "#475569", "#334155"]} position={[0, 0, 0]} />

      {/* Decorative center runic circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[38.5, 39, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
      </mesh>
      
      {/* Boundary Pillars */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const radius = 39.0;
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        return (
          <group key={i} position={[x, 0, z]}>
            {/* Pillar Base */}
            <mesh position={[0, 1.5, 0]}>
              <cylinderGeometry args={[1.2, 1.2, 3, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.9} />
            </mesh>
            {/* Glowing top element */}
            <mesh position={[0, 3.2, 0]}>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshBasicMaterial color="#3b82f6" />
            </mesh>
            <pointLight position={[0, 3.2, 0]} color="#3b82f6" intensity={1.5} distance={12} />
          </group>
        );
      })}

      {/* Outer sky sphere or hemisphere light */}
      <hemisphereLight skyColor="#24283b" groundColor="#15161e" intensity={1.0} />
    </>
  );
}

// Main Canvas Wrapper
export function Arena3DCanvas({ simulation, onSelectTarget }: Arena3DCanvasProps) {
  const [, setTick] = useState(0);

  // High frequency 60 FPS update of simulation coordinates
  useFrame((state, delta) => {
    // Clamp delta to prevent huge jumps when tab transitions
    const clampedDelta = Math.min(delta, 0.1);
    simulation.update(clampedDelta);
    // Force a React state update for high-frequency coordinate bindings
    setTick(t => t + 1);
  });

  const player = simulation.playerActor;

  return (
    <>
      {/* 3rd Person Control Rig */}
      <CameraRig 
        player={player} 
        simulation={simulation} 
        onSelectTarget={onSelectTarget} 
      />

      {/* World Elements */}
      <ArenaWorld />

      {/* Render Obstacles */}
      {simulation.obstacles.map((obs) => (
        <ObstacleMesh key={obs.id} obstacle={obs} />
      ))}

      {/* Render Actors */}
      {simulation.actors.map((actor) => (
        <ActorMesh
          key={actor.id}
          actor={actor}
          isTargeted={player.target?.id === actor.id}
          onSelect={() => {
            player.target = actor;
            onSelectTarget(actor);
          }}
        />
      ))}

      {/* Projectiles */}
      {simulation.projectiles.map((proj) => (
        <ProjectileMesh key={proj.id} proj={proj} />
      ))}

      {/* Danger Zones */}
      {simulation.dangerZones.map((zone) => (
        <DangerZoneMesh key={zone.id} zone={zone} />
      ))}

      {/* Visual Effects */}
      {simulation.visualEffects.map((eff) => (
        <VisualEffectMesh key={eff.id} effect={eff} />
      ))}

      {/* Floating Texts */}
      {simulation.floatingTexts.map((ft) => (
        <FloatingTextMesh key={ft.id} ft={ft} />
      ))}
    </>
  );
}

export default function ArenaCanvasContainer(props: Arena3DCanvasProps) {
  return (
    <div className="w-full h-[550px] bg-zinc-950 relative overflow-hidden rounded-lg border border-border/80 shadow-2xl">
      <Canvas shadows camera={{ fov: 45, near: 0.1, far: 1000 }}>
        <Arena3DCanvas {...props} />
      </Canvas>
      {/* Camera Instructions Overlay */}
      <div className="absolute top-2 left-2 bg-black/60 backdrop-blur border border-white/5 rounded px-2 py-1 text-[9px] text-zinc-400 select-none pointer-events-none">
        <span className="font-bold text-zinc-200">Controls:</span> WASD Move | Left-Drag Camera | Right-Drag Steer | Scroll Zoom | Tab Target | 1-3 Hotkeys
      </div>
    </div>
  );
}
