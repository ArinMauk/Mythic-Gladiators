import { CombatSimulation } from "./combat/simulation";
import { Actor } from "./combat/actor";
import { CustomAbility } from "./combat/ability";
import abilitiesData from "./combat/data/abilities.json";
import * as THREE from "three";

export class MultiplayerManager {
  peer: any = null;
  connections: any[] = [];
  simulation: CombatSimulation;
  isHost: boolean;
  roomId: string;
  myUsername: string;
  myClass: string;
  selectedTalents: string[];
  cheats: any;
  PeerClass: any = null;
  onStatusChange: (status: string) => void;
  onPeerConnect?: (peerId: string, username: string) => void;
  onLevelChange?: (level: any) => void;
  onStartMatch?: (level: any) => void;
  onLobbyPlayersUpdate?: (players: any[]) => void;

  constructor(
    simulation: CombatSimulation,
    isHost: boolean,
    roomId: string,
    myUsername: string,
    myClass: string,
    selectedTalents: string[],
    cheats: any,
    PeerClass: any,
    onStatusChange: (status: string) => void
  ) {
    this.simulation = simulation;
    this.isHost = isHost;
    this.roomId = roomId;
    this.myUsername = myUsername;
    this.myClass = myClass;
    this.selectedTalents = selectedTalents;
    this.cheats = cheats;
    this.PeerClass = PeerClass;
    this.onStatusChange = onStatusChange;

    if (typeof window !== "undefined" && this.PeerClass) {
      this.initPeer();
    }
  }

  initPeer() {
    this.onStatusChange("Initializing peer connection...");
    
    // We use a prefix 'mg-' to avoid collisions with random peers on PeerJS Cloud
    const peerId = this.isHost ? `mg-${this.roomId}` : undefined;

    try {
      this.peer = new this.PeerClass(peerId, {
        debug: 3,
        config: {
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
            { urls: "stun:stun2.l.google.com:19302" },
            { urls: "stun:stun3.l.google.com:19302" },
            { urls: "stun:stun4.l.google.com:19302" },
          ]
        }
      });

      this.peer.on("open", (id: string) => {
        this.onStatusChange(this.isHost ? "Room open! Waiting for players..." : "Connected to matchmaking. Connecting to room...");
        if (!this.isHost) {
          this.connectToHost();
        }
      });

      this.peer.on("error", (err: any) => {
        console.error("PeerJS Error:", err);
        if (err.type === "peer-unavailable") {
          this.onStatusChange("Host not found. Verify the Room Link is correct.");
        } else {
          this.onStatusChange(`Connection error: ${err.message || err.type}`);
        }
      });

      if (this.isHost) {
        this.peer.on("connection", (conn: any) => {
          this.handleConnection(conn);
        });
      }
    } catch (e) {
      console.error("PeerJS init crash:", e);
      this.onStatusChange("Failed to load PeerJS module.");
    }
  }

  connectToHost() {
    const hostPeerId = `mg-${this.roomId}`;
    this.onStatusChange(`Connecting to Host: ${this.roomId}...`);
    
    const conn = this.peer.connect(hostPeerId);
    this.handleConnection(conn);
  }

  handleConnection(conn: any) {
    this.onStatusChange("Establishing secure WebRTC channel...");

    console.log("[P2P] DataConnection created", {
      peer: conn.peer,
      open: conn.open,
    });

    conn.on("open", () => {
      console.log("[P2P] DATA CHANNEL OPEN", conn.peer);
      this.onStatusChange(this.isHost ? "Player connected! Synced." : "Joined Match! Loading arena...");
      
      if (!this.isHost) {
        this.connections.push(conn);
        // Send our profile to host
        conn.send({
          type: "CLIENT_JOIN",
          username: this.myUsername,
          class: this.myClass,
          talents: this.selectedTalents,
          cheats: this.cheats,
        });
      } else {
        this.connections.push(conn);
        this.broadcastLobbyPlayers();
      }
    });

    conn.on("error", (err: any) => {
      console.error("[P2P] DataConnection error", err);
    });

    const pc = conn.peerConnection;
    if (pc) {
      console.log("[P2P] Attached ICE event listeners for peer:", conn.peer);
      pc.addEventListener("iceconnectionstatechange", () => {
        console.log("[P2P] ICE connection state:", pc.iceConnectionState);
      });
      pc.addEventListener("connectionstatechange", () => {
        console.log("[P2P] Peer connection state:", pc.connectionState);
      });
      pc.addEventListener("icegatheringstatechange", () => {
        console.log("[P2P] ICE gathering state:", pc.iceGatheringState);
      });
    }

    conn.on("data", (data: any) => {
      if (!data || !data.type) return;

      if (this.isHost) {
        this.handleHostReceivedData(conn, data);
      } else {
        this.handleClientReceivedData(conn, data);
      }
    });

    conn.on("close", () => {
      this.connections = this.connections.filter((c) => c.peer !== conn.peer);
      this.onStatusChange(this.isHost ? "Gladiator disconnected." : "Disconnected from match.");
      
      if (this.isHost) {
        this.broadcastLobbyPlayers();
      }

      // Remove peer actor from simulation
      const peerActorId = conn.peer;
      this.simulation.actors = this.simulation.actors.filter((a) => a.id !== peerActorId);
      this.simulation.log(`A gladiator has left the arena.`);
    });

    conn.on("error", (err: any) => {
      console.error("Connection error:", err);
    });
  }

  handleHostReceivedData(conn: any, data: any) {
    const peerId = conn.peer;

    switch (data.type) {
      case "CLIENT_JOIN": {
        // Store join data on the connection object for the lobby state
        conn.lobbyData = {
          username: data.username,
          class: data.class,
          talents: data.talents,
          cheats: data.cheats
        };

        // Broadcast updated lobby player list to all clients
        this.broadcastLobbyPlayers();

        // Remove an AI companion to keep party size balanced (PvE mode only)
        if (this.simulation.selectedLevel === "level-2" || this.simulation.actors.length > 2) {
          const aiCompanions = this.simulation.actors.filter((a) => a.faction === "player" && !a.isUser && a.id !== peerId && !this.connections.some(c => c.peer === a.id));
          if (aiCompanions.length > 0) {
            // Remove first active AI companion
            const companionToRemove = aiCompanions[0];
            this.simulation.actors = this.simulation.actors.filter((a) => a.id !== companionToRemove.id);
            this.simulation.log(`AI companion ${companionToRemove.name} leaves the party, replaced by ${data.username}!`);
          }
        }

        // Add player to Host's simulation
        const faction = this.simulation.selectedLevel === "level-1" && this.simulation.actors[0].faction === "player" && this.simulation.bossActor.faction === "enemy" && this.simulation.actors.length === 2 && this.simulation.bossActor.id !== "user" && data.cheats?.level ? "enemy" : "player"; 
        
        // Let's check gameMode for PvP:
        const isPvPDuel = this.simulation.bossActor.id === "user" || data.cheats?.level !== undefined && this.simulation.actors.some(a => a.id === "user"); 
        
        const clientFaction = this.simulation.selectedLevel === "level-1" && this.simulation.actors.length >= 2 && this.simulation.actors.some(a => a.id === "user" && a.faction === "player") && this.simulation.actors.some(a => a.id !== "user" && a.faction === "enemy") && !this.simulation.actors.some(a => a.id !== "user" && a.faction === "player" && !a.isUser)
          ? "enemy" 
          : "player";

        const finalFaction = this.simulation.selectedLevel === "level-1" && this.simulation.bossActor.id === "user" ? "enemy" : clientFaction;

        const role = data.class === "priest" ? "healer" : "damage";
        const spawnPos = new THREE.Vector3(this.isHost ? -8 : 8, 0, this.isHost ? -8 : 8);
        
        // PvP Mode Override
        let actualFaction = clientFaction;
        if (this.simulation.selectedLevel === "level-1") {
          // If level-1, look if we are playing PvP. In game context, gameMode will decide.
          // We can set client faction to opposite team if gameMode is pvp.
          const isPvP = this.simulation.bossActor.id === "user" || this.simulation.actors.some(a => a.id === "user" && a.faction === "player") && this.simulation.actors.some(a => a.id !== "user" && a.faction === "enemy");
        }

        // Let's create the client's actor
        const clientActor = new Actor(
          peerId,
          data.username,
          data.class,
          finalFaction,
          role,
          spawnPos,
          false
        );

        // Apply cheats if sent
        if (data.cheats) {
          clientActor.isGodMode = data.cheats.godMode;
          clientActor.isNoCooldowns = data.cheats.noCooldowns;
          clientActor.isInstantCast = data.cheats.instantCast;
          clientActor.cheatSpeedMultiplier = data.cheats.speedMultiplier;
          clientActor.damageMultiplier = data.cheats.damageMultiplier;
          clientActor.healingMultiplier = data.cheats.healingMultiplier;
          clientActor.setCheatLevel(data.cheats.level);
          clientActor.gold = data.cheats.gold;
        }

        this.simulation.actors.push(clientActor);
        this.simulation.log(`${data.username} (${data.class.toUpperCase()}) entered the arena!`);
        
        if (this.onPeerConnect) {
          this.onPeerConnect(peerId, data.username);
        }
        break;
      }

      case "CLIENT_UPDATE": {
        const actor = this.simulation.actors.find((a) => a.id === peerId);
        if (actor) {
          actor.position.set(data.position.x, data.position.y, data.position.z);
          actor.yaw = data.yaw;
          actor.health = data.health;
          actor.maxHealth = data.maxHealth;
          actor.resources = data.resources;
          actor.animState = data.animState;
          
          if (data.cheats) {
            actor.isGodMode = data.cheats.godMode;
            actor.isNoCooldowns = data.cheats.noCooldowns;
            actor.isInstantCast = data.cheats.instantCast;
            actor.cheatSpeedMultiplier = data.cheats.speedMultiplier;
            actor.damageMultiplier = data.cheats.damageMultiplier;
            actor.healingMultiplier = data.cheats.healingMultiplier;
            actor.setCheatLevel(data.cheats.level);
            actor.gold = data.cheats.gold;
          }
        }
        break;
      }

      case "CLIENT_CAST": {
        const caster = this.simulation.actors.find((a) => a.id === peerId);
        if (caster) {
          const target = data.targetId ? (this.simulation.actors.find((a) => a.id === data.targetId) || null) : null;
          const abConf = (abilitiesData as any)[data.abilityId];
          if (abConf) {
            const ability = new CustomAbility(data.abilityId, abConf);
            ability.startCast(caster, target, this.simulation);
          }
        }
        break;
      }
    }
  }

  handleClientReceivedData(conn: any, data: any) {
    switch (data.type) {
      case "LOBBY_LEVEL_CHANGE": {
        if (data.level && this.onLevelChange) {
          this.onLevelChange(data.level);
        }
        break;
      }
      case "START_MATCH": {
        if (data.level && this.onStartMatch) {
          this.onStartMatch(data.level);
        }
        break;
      }
      case "LOBBY_PLAYERS_UPDATE": {
        if (data.players && this.onLobbyPlayersUpdate) {
          this.onLobbyPlayersUpdate(data.players);
        }
        break;
      }

      case "HOST_UPDATE": {
        // Synchronize entire simulation state
        data.actors.forEach((hostActor: any) => {
          if (hostActor.id === "user") {
            // This is the Host's player, we map it to 'host_player' in Client simulation
            let clientLocalHostActor = this.simulation.actors.find((a) => a.id === "host_player");
            if (!clientLocalHostActor) {
              clientLocalHostActor = new Actor(
                "host_player",
                hostActor.name,
                hostActor.class,
                hostActor.faction,
                hostActor.role,
                new THREE.Vector3(hostActor.position.x, hostActor.position.y, hostActor.position.z),
                false
              );
              this.simulation.actors.push(clientLocalHostActor);
            }
            clientLocalHostActor.position.set(hostActor.position.x, hostActor.position.y, hostActor.position.z);
            clientLocalHostActor.yaw = hostActor.yaw;
            clientLocalHostActor.health = hostActor.health;
            clientLocalHostActor.maxHealth = hostActor.maxHealth;
            clientLocalHostActor.resources = hostActor.resources;
            clientLocalHostActor.shield = hostActor.shield;
            clientLocalHostActor.animState = hostActor.animState;
            clientLocalHostActor.isCasting = hostActor.isCasting;
            clientLocalHostActor.castName = hostActor.castName;
            clientLocalHostActor.castTimeRemaining = hostActor.castTimeRemaining;
            clientLocalHostActor.castTimeTotal = hostActor.castTimeTotal;
            clientLocalHostActor.level = hostActor.level;
            clientLocalHostActor.gold = hostActor.gold;
          } else if (hostActor.id === this.peer.id) {
            // This is the Client's representation on the Host.
            // Client's authoritative character is "user". Let's update HP/resources ONLY if we take hit/damage.
            const userActor = this.simulation.playerActor;
            if (userActor) {
              // If Host says we took damage, adjust our local health
              if (hostActor.health < userActor.health && !userActor.isGodMode) {
                userActor.health = hostActor.health;
              }
            }
          } else {
            // General Boss or Companion NPC
            let npc = this.simulation.actors.find((a) => a.id === hostActor.id);
            if (!npc) {
              npc = new Actor(
                hostActor.id,
                hostActor.name,
                hostActor.class,
                hostActor.faction,
                hostActor.role,
                new THREE.Vector3(hostActor.position.x, hostActor.position.y, hostActor.position.z),
                false
              );
              this.simulation.actors.push(npc);
            }
            npc.position.set(hostActor.position.x, hostActor.position.y, hostActor.position.z);
            npc.yaw = hostActor.yaw;
            npc.health = hostActor.health;
            npc.maxHealth = hostActor.maxHealth;
            npc.resources = hostActor.resources;
            npc.shield = hostActor.shield;
            npc.animState = hostActor.animState;
            npc.isCasting = hostActor.isCasting;
            npc.castName = hostActor.castName;
            npc.castTimeRemaining = hostActor.castTimeRemaining;
            npc.castTimeTotal = hostActor.castTimeTotal;
            npc.level = hostActor.level;
            npc.gold = hostActor.gold;

            // Make sure target is mapped correctly
            if (hostActor.targetId) {
              const tgt = this.simulation.actors.find((a) => a.id === hostActor.targetId || (hostActor.targetId === "user" && a.id === "host_player") || (hostActor.targetId === this.peer.id && a.id === "user"));
              npc.target = tgt || null;
            }
          }
        });

        // Sync list of actors (prune dead actors that left)
        const activeHostIds = data.actors.map((a: any) => a.id);
        this.simulation.actors = this.simulation.actors.filter((a) => {
          if (a.id === "user") return true;
          if (a.id === "host_player") return activeHostIds.includes("user");
          return activeHostIds.includes(a.id);
        });

        // Set Boss reference on Client
        const hostBoss = data.actors.find((a: any) => a.class === "boss" || a.role === "tank" && a.faction === "enemy");
        if (hostBoss) {
          const bossLocalId = hostBoss.id === "user" ? "host_player" : hostBoss.id;
          const localBossRef = this.simulation.actors.find((a) => a.id === bossLocalId);
          if (localBossRef) {
            this.simulation.bossActor = localBossRef;
          }
        }

        // Sync danger zones
        this.simulation.dangerZones = data.dangerZones.map((hostZone: any) => {
          const caster = this.simulation.actors.find(a => a.id === hostZone.casterId || (hostZone.casterId === "user" && a.id === "host_player") || (hostZone.casterId === this.peer.id && a.id === "user")) || this.simulation.playerActor;
          return {
            id: hostZone.id,
            position: new THREE.Vector3(hostZone.position.x, hostZone.position.y, hostZone.position.z),
            radius: hostZone.radius,
            duration: hostZone.duration,
            elapsed: hostZone.elapsed,
            damage: hostZone.damage,
            caster
          };
        });

        // Sync projectiles
        this.simulation.projectiles = data.projectiles.map((hostProj: any) => {
          const target = this.simulation.actors.find(a => a.id === hostProj.targetId || (hostProj.targetId === "user" && a.id === "host_player") || (hostProj.targetId === this.peer.id && a.id === "user")) || this.simulation.playerActor;
          return {
            id: hostProj.id,
            position: new THREE.Vector3(hostProj.position.x, hostProj.position.y, hostProj.position.z),
            target,
            speed: hostProj.speed,
            color: hostProj.color,
            size: hostProj.size,
            isDead: false,
            update: () => {}
          } as any;
        });

        // Overwrite combat log
        this.simulation.battleLog = data.battleLog;
        break;
      }

      case "SPAWN_VFX": {
        this.simulation.spawnVisualEffect(
          data.vfxType,
          new THREE.Vector3(data.position.x, data.position.y, data.position.z),
          undefined,
          data.color,
          data.size,
          data.duration
        );
        break;
      }

      case "FLOATING_TEXT": {
        this.simulation.spawnFloatingText(
          data.text,
          new THREE.Vector3(data.position.x, data.position.y, data.position.z),
          data.color,
          data.isCrit
        );
        break;
      }
    }
  }

  // Periodic loop tick (usually run at 20-30Hz)
  sendTickUpdate() {
    if (!this.peer || this.connections.length === 0) return;

    if (this.isHost) {
      // 1. Pack Host Simulation Data to send to all Clients
      const packedActors = this.simulation.actors.map((actor) => {
        return {
          id: actor.id,
          name: actor.name,
          class: actor.class,
          faction: actor.faction,
          role: actor.role,
          position: { x: actor.position.x, y: actor.position.y, z: actor.position.z },
          yaw: actor.yaw,
          health: actor.health,
          maxHealth: actor.maxHealth,
          resources: actor.resources,
          maxResources: actor.maxResources,
          shield: actor.shield,
          animState: actor.animState,
          isCasting: actor.isCasting,
          castName: actor.castName,
          castTimeRemaining: actor.castTimeRemaining,
          castTimeTotal: actor.castTimeTotal,
          targetId: actor.target ? actor.target.id : null,
          level: actor.level,
          gold: actor.gold,
        };
      });

      const packedDangerZones = this.simulation.dangerZones.map((zone) => {
        return {
          id: zone.id,
          position: { x: zone.position.x, y: zone.position.y, z: zone.position.z },
          radius: zone.radius,
          duration: zone.duration,
          elapsed: zone.elapsed,
          damage: zone.damage,
          casterId: zone.caster.id
        };
      });

      const packedProjectiles = this.simulation.projectiles.map((proj) => {
        return {
          id: proj.id,
          position: { x: proj.position.x, y: proj.position.y, z: proj.position.z },
          targetId: proj.target.id,
          color: proj.color,
          size: proj.size,
          speed: proj.speed,
        };
      });

      const payload = {
        type: "HOST_UPDATE",
        actors: packedActors,
        dangerZones: packedDangerZones,
        projectiles: packedProjectiles,
        battleLog: this.simulation.battleLog,
      };

      this.connections.forEach((conn) => {
        if (conn.open) {
          conn.send(payload);
        }
      });
    } else {
      // 2. Client packs local user data and sends to Host
      const user = this.simulation.playerActor;
      if (user) {
        const payload = {
          type: "CLIENT_UPDATE",
          position: { x: user.position.x, y: user.position.y, z: user.position.z },
          yaw: user.yaw,
          health: user.health,
          maxHealth: user.maxHealth,
          resources: user.resources,
          animState: user.animState,
          cheats: this.cheats,
        };

        this.connections.forEach((conn) => {
          if (conn.open) {
            conn.send(payload);
          }
        });
      }
    }
  }

  // Cast Spell triggered on Client bar
  broadcastClientCast(abilityId: string, targetId: string | null) {
    if (this.isHost) return; // Host casts locally which syncs via host state tick

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "CLIENT_CAST",
          abilityId,
          targetId: targetId === "host_player" ? "user" : targetId,
        });
      }
    });
  }

  // Spawn visual effects to all clients (Host authority)
  broadcastVisualEffect(vfxType: string, position: THREE.Vector3, color: string, size: number, duration: number) {
    if (!this.isHost) return;

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "SPAWN_VFX",
          vfxType,
          position: { x: position.x, y: position.y, z: position.z },
          color,
          size,
          duration,
        });
      }
    });
  }

  // Spawn floating combat text (Host authority)
  broadcastFloatingText(text: string, position: THREE.Vector3, color: string, isCrit: boolean) {
    if (!this.isHost) return;

    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "FLOATING_TEXT",
          text,
          position: { x: position.x, y: position.y, z: position.z },
          color,
          isCrit,
        });
      }
    });
  }

  updateLocalCheats(newCheats: any) {
    this.cheats = newCheats;
  }

  broadcastLevelChange(level: string) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "LOBBY_LEVEL_CHANGE",
          level: level
        });
      }
    });
  }

  broadcastStartMatch(level: string) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send({
          type: "START_MATCH",
          level: level
        });
      }
    });
  }

  broadcastLobbyPlayers() {
    const list = [
      { peerId: "host", username: this.myUsername, class: this.myClass, isHost: true },
      ...this.connections.map(c => ({
        peerId: c.peer,
        username: c.lobbyData?.username || "Guest",
        class: c.lobbyData?.class || "warrior",
        isHost: false
      }))
    ];
    this.connections.forEach(conn => {
      if (conn.open) {
        conn.send({
          type: "LOBBY_PLAYERS_UPDATE",
          players: list
        });
      }
    });
    if (this.onLobbyPlayersUpdate) {
      this.onLobbyPlayersUpdate(list);
    }
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
    }
  }
}
