# Wiki: Combat Component Blueprint (Master Reference)

This document is the unified, authoritative guide outlining the complete architectural flow, logic decisions, and object-oriented memory snapshots of the **3rd-Person WoW-like Combat System** in **Mythic-Gladiators**. All diagrams are built natively using **Mermaid** syntax.

---

## 1. Flowcharts (Behavioral Logic)

The following flowcharts map the execution of high-frequency physics/state loops and the Finite State Machine (FSM) structures of the gladiator actors.

### A. High-Frequency Game Loop & Update Flow

This chart captures the frame tick inside React Three Fiber (`useFrame`). The loop runs at 60 FPS in WebGL and is completely decoupled from slow React rendering.

```mermaid
graph TD
  Start([useFrame Tick]) --> Delta[Retrieve Delta Time]
  Delta --> ActorTick[Update Actors]
  
  subgraph Actor Update Loop
    ActorTick --> CD[Decrement Cooldowns]
    CD --> ResourceRegen[Regenerate Resources based on Class]
    ResourceRegen --> CastingCheck{Is Actor Casting?}
    CastingCheck -- Yes --> MovementCheck{Is Actor Moving?}
    MovementCheck -- Yes --> Interrupt[Interrupt Cast!]
    MovementCheck -- No --> DecTimer[Decrement Cast Timer]
    DecTimer --> CastFinish{Timer <= 0?}
    CastFinish -- Yes --> FinishCast[Trigger Cast Callback]
    CastFinish -- No --> MovePhys[Update Physics Position]
    Interrupt --> MovePhys
    CastingCheck -- No --> MovePhys
    MovePhys --> MapClamp[Clamp coordinates inside 38m Arena circle]
  end

  MapClamp --> ProjTick[Update Projectiles]
  subgraph Projectile Update
    ProjTick --> ProjDead{Target Dead?}
    ProjDead -- Yes --> KillProj[Flag Projectile Dead]
    ProjDead -- No --> ProjMove[Move toward target center coordinate]
    ProjMove --> HitCheck{Reached target?}
    HitCheck -- Yes --> ProjImpact[Trigger onHit Callback]
    ProjImpact --> TakeDmg[Apply takeDamage on Target]
    TakeDmg --> KillProj
  end

  KillProj --> ZoneTick[Update Ground Danger Zones]
  subgraph Danger Zone Ticks
    ZoneTick --> DmgTick{Second crossed?}
    DmgTick -- Yes --> InsideCheck[Scan actors inside radius]
    InsideCheck --> FireDmg[Inflict tick Fire damage]
    FireDmg --> ZoneExpire{Elapsed >= Duration?}
    DmgTick -- No --> ZoneExpire
    ZoneExpire -- Yes --> KillZone[Destroy Danger Zone]
  end

  KillZone --> ClearFfx[Prune dead effects and floating text]
  ClearFfx --> FSMTick[Execute Companion & Boss AI ticks]
  FSMTick --> Done([End of Frame Tick])
```

---

### B. Companion AI FSM Logic Flow

This flowchart describes the automated decision-making of the player's AI companions (Bob, Jessica, Dillan, Sarah) during active combat.

```mermaid
flowchart TD
  Start([AI Companion Decision]) --> Alive{Is Companion Alive?}
  Alive -- No --> EndDead([No Action])
  Alive -- Yes --> Casting{Is Casting?}
  Casting -- Yes --> EndCast([Maintain Cast])
  Casting -- No --> Healer{Role is Healer?}

  Healer -- Yes --> FindInjured{Low HP Friendly Teammate <= 80%?}
  FindInjured -- Yes --> LockFriendly[Target = Low HP Ally]
  LockFriendly --> HealSpell{Healing spell off CD?}
  HealSpell -- Yes --> DistHeal{Ally in range?}
  DistHeal -- Yes --> StopHeal[Stop moving, start casting heal spell]
  DistHeal -- No --> RunHeal[Move towards Low HP Ally]
  HealSpell -- No --> LockBoss[Target = Evil Raid Boss]
  FindInjured -- No --> LockBoss

  Healer -- No --> LockBoss
  LockBoss --> DpsSpell{Any DPS Spell off CD?}
  DpsSpell -- Yes --> DistDps{Boss in range?}
  DistDps -- Yes --> StopDps[Stop moving, start casting spell]
  DistDps -- No --> RunDps[Move towards Boss]
  
  DpsSpell -- No --> CheckRange{Is role Tank?}
  CheckRange -- Yes --> MoveTank[Stay close: Move within 4m of Boss]
  CheckRange -- No --> MoveRanged[Stay back: Move within 20m of Boss]

  StopHeal --> EndAI([End AI tick])
  RunHeal --> EndAI
  StopDps --> EndAI
  RunDps --> EndAI
  MoveTank --> EndAI
  MoveRanged --> EndAI
```

---

### C. Enemy Boss AI Decision Flow

This chart shows how the Evil Raid Boss resolves target priorities via threat, executing heavy physical strikes or casting environmental hazard circles dynamically.

```mermaid
flowchart TD
  Start([Boss Decision Loop]) --> TargetAggro{Any active Threat in Map?}
  
  TargetAggro -- Yes --> GetMaxThreat[Set Target = Actor with highest Threat]
  TargetAggro -- No --> GetClosest[Set Target = Closest alive Player/Companion]

  GetMaxThreat --> RainCD{Rain of Fire off CD?}
  GetClosest --> RainCD
  
  RainCD -- Yes --> StartRain[Cast Rain of Fire: Spawns ground danger zones]
  RainCD -- No --> SmashCD{Boss Smash off CD?}

  SmashCD -- Yes --> DistSmash{Target in melee range <= 6m?}
  DistSmash -- Yes --> ExecuteSmash[Cast Boss Smash: Heavy single-target physical hit]
  DistSmash -- No --> MoveSmash[Move towards target]

  SmashCD -- No --> AutoCD{Melee auto-attack ready?}
  AutoCD -- Yes --> ExecuteAuto[Perform Melee Attack: Medium physical hit]
  AutoCD -- No --> IdleBoss[Face Target: Turn toward target yaw]

  StartRain --> EndAI([End Boss AI tick])
  ExecuteSmash --> EndAI
  MoveSmash --> EndAI
  ExecuteAuto --> EndAI
  IdleBoss --> EndAI
```

---

## 2. Sequence Diagrams (Chronological Interactions)

These diagrams describe the sequence of events across multiple objects over time during core combat scenarios.

### A. Casting a Spell Chronology (Mage Fireball)

```mermaid
sequenceDiagram
  autonumber
  actor Player
  participant UI as game-arena-screen (React HUD)
  participant Sim as CombatSimulation (Game Loop)
  participant Caster as Actor (Player Model)
  participant Ability as Ability (Fireball)
  participant Target as Actor (Evil Raid Boss)
  participant Projectile as Projectile

  Player->>UI: Presses "1" Hotkey
  UI->>Ability: startCast(Caster, Target, Sim)
  Ability->>Ability: canCast(Caster, Target)
  Note over Ability: Checks GCD, Cooldowns, Resource Cost & Range
  Ability->>Caster: spendResource("mana", 100)
  
  alt Cast Time > 0 (e.g. Fireball, 2s Cast)
    Ability->>Caster: startCastTimer("Fireball", 2.0, callback)
    Caster->>Caster: Set state to "cast"
    loop Every Frame for 2 seconds
      Sim->>Caster: update(deltaTime)
      Note over Caster: Decrements cast timer
    end
    Caster->>Ability: Triggers callback (execute)
  else Instant Cast (e.g. Mortal Strike)
    Ability->>Ability: execute(Caster, Target, Sim)
  end

  Ability->>Sim: spawnProjectile(startPos, target, speed, color, onHit)
  Sim->>Projectile: Instantiate new Projectile
  
  loop Every Frame until collision
    Sim->>Projectile: update(deltaTime)
    Note over Projectile: Moves coordinate toward target torso
  end

  Projectile->>Target: Triggers onHit() callback
  Target->>Target: takeDamage(75, Caster, "fire")
  Note over Target: Subtracts HP, accounts for armor/shields
  Target->>Sim: Registers threat (for Boss AI)
  
  Target->>Sim: spawnFloatingText("75", position, color)
  Target->>Sim: spawnVisualEffect("damage_burst", position)
  Projectile->>Sim: Destroy Projectile
```

---

### B. Threat & Target Aggro Resolution

```mermaid
sequenceDiagram
  participant Tank as Actor (Bob the Warrior)
  participant Healer as Actor (Dillan the Priest)
  participant Boss as Actor (Evil Raid Boss)

  Tank->>Boss: Deals 20 damage (with Tank x3 threat multiplier)
  Boss->>Boss: Updates threatMap[Bob] = 60
  
  Healer->>Tank: Heals Bob for 50 health
  Boss->>Boss: Updates threatMap[Dillan] = 25 (Heal threat)

  loop Every Frame
    Boss->>Boss: runBossAI()
    Boss->>Boss: Scan threatMap for highest threat actor
    Note over Boss: Bob has 60 threat (highest)
    Boss->>Boss: target = Bob
    
    alt Bob is out of range
      Boss->>Boss: Move towards Bob
    else Bob is in melee range
      Boss->>Bob: Casts Boss Smash!
    end
  end
```

---

## 3. Object Diagrams (Structural Relationships)

These diagrams visualize the structural definitions and Heap relationships of entities in memory.

### A. Class Relationship Map

```mermaid
classDiagram
  CombatSimulation "1" *-- "many" Actor : manages
  CombatSimulation "1" *-- "many" Projectile : tracks
  CombatSimulation "1" *-- "many" DangerZone : schedules
  CombatSimulation "1" *-- "many" FloatingText : renders
  CombatSimulation "1" *-- "many" VisualEffect : animates

  Actor "1" o-- "0..1" Actor : target
  Actor "1" o-- "many" Ability : classAbilities

  Ability <|-- MortalStrike
  Ability <|-- Smite
  Ability <|-- FlashHeal
  Ability <|-- SteadyShot
  Ability <|-- SinisterStrike
  Ability <|-- Fireball
  Ability <|-- ShadowBolt
  Ability <|-- Judgment
  Ability <|-- LightningBolt
  Ability <|-- BossSmash
  Ability <|-- BossFireRain

  Projectile "1" o-- "1" Actor : target

  class CombatSimulation {
    +Actor playerActor
    +Actor bossActor
    +Actor[] actors
    +Projectile[] projectiles
    +DangerZone[] dangerZones
    +FloatingText[] floatingTexts
    +VisualEffect[] visualEffects
    +string[] battleLog
    +update(deltaTime)
    +spawnProjectile()
    +spawnDangerZone()
  }

  class Actor {
    +string id
    +string name
    +string class
    +string faction
    +string role
    +Vector3 position
    +Vector3 velocity
    +number yaw
    +Actor target
    +number health
    +number maxHealth
    +number shield
    +Record resources
    +Map cooldowns
    +boolean isCasting
    +string castName
    +takeDamage(amount, attacker, type)
    +heal(amount, healer)
    +update(deltaTime)
  }

  class Ability {
    +string id
    +string name
    +string icon
    +number castTime
    +number cooldown
    +number range
    +SkillCost cost
    +canCast(caster, target)
    +startCast(caster, target, simulation)
    +execute(caster, target, simulation)*
  }

  class Projectile {
    +string id
    +Vector3 position
    +Actor target
    +number speed
    +string color
    +number size
    +onHit()
    +update(deltaTime)
  }

  class DangerZone {
    +string id
    +Vector3 position
    +number radius
    +number duration
    +number damage
    +Actor caster
  }
```

---

### B. Memory Heap State Map

```mermaid
classDiagram
  class CombatSimulation_Heap {
    playerActor: ref Player
    bossActor: ref Boss
    actors: [ref Player, ref Boss, ref Bob, ref Dillan]
    projectiles: [ref Proj_Fireball]
  }

  class Player_Actor {
    id: "user"
    target: ref Boss
    health: 200
  }

  class Boss_Actor {
    id: "boss"
    target: ref Player
    health: 1350
    threatMap: { "user": 120, "bob": 340 }
  }

  class Fireball_Projectile {
    id: "proj_f1"
    position: Vector3(10, 1, -2)
    target: ref Boss
    onHit: ref Callback
  }

  CombatSimulation_Heap --> Player_Actor : playerActor
  CombatSimulation_Heap --> Boss_Actor : bossActor
  Player_Actor --> Boss_Actor : target
  Boss_Actor --> Player_Actor : target
  CombatSimulation_Heap --> Fireball_Projectile : projectiles[0]
  Fireball_Projectile --> Boss_Actor : target
```
