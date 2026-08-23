# Multiplayer Waiting Lobby & WebRTC Sync Design

This document details the architecture, design, and lifecycle synchronization of the P2P Multiplayer Waiting Lobby implemented on the `bug/fix_arena` branch compared to the original master branch.

---

## 1. Architectural Changes (vs. Master Branch)

| Feature | Original Master Branch | Lobby Refactored (bug/fix_arena) |
|---|---|---|
| **Level Selection** | Standalone screen forced for both Host and Client. | Bypassed for Co-Op play. Host selects the level inside the lobby. |
| **P2P Sockets** | Opened inside `GameArenaScreen` body on mount, bound to `simulation` instance. | Decoupled from `simulation`. Opening/editing battle states never closes the peer connection. |
| **Connected Players** | Hardcoded to list local PvE actors (including AI companions). | Decoupled and tracked via dedicated React state `lobbyPlayers` populated from real WebRTC open handshake events. |
| **Launch Synchronicity** | Zero. Client starts immediately upon loading level-select, causing fragmented states. | Fully synchronized. Client waits in Lobby; Host launches, which broadcasts `START_MATCH` and mounts both 3D scenes concurrently. |

---

## 2. Component Lifecycles

### Host Flow
1. Instantiates `MultiplayerManager` with roomId.
2. Listen for `"CLIENT_JOIN"` messages from connected clients.
3. Upon receiving, stores client info and broadcasts the real-time list of all lobby players (`"LOBBY_PLAYERS_UPDATE"`).
4. Host selects target level.
5. Clicking **Launch Gladiator Arena** instantiates a clean level-specific `CombatSimulation`, populates connected players, balances remaining slots with AI, and transmits `"START_MATCH"`.

### Client Flow
1. Joins room with `?room=CODE` parameter from URL, bypassing solo class/level selection screens.
2. Connects to Host's room peer `mg-CODE`.
3. Handshake completes (`conn.on("open")`), client sends `"CLIENT_JOIN"` message.
4. Renders Waiting Room. Displays Host's level selection and connected player cards.
5. Receives `"START_MATCH"` command, instantiates the identical local `CombatSimulation`, populates actors, and launches the 3D canvas smoothly.

---

## 3. Local Testing & WebRTC Troubleshooting

Since WebRTC is a highly-secure browser standard, local testing on the same machine (localhost loopback) triggers browser sandbox security. Use these steps to guarantee an instant local connection:

1. **Test in Ordinary Tabs**: Do NOT use Edge InPrivate or Chrome Incognito. Private browsing modes completely block UDP loopback port bindings.
2. **Use Two Different Browsers**: Open Player 1 (Host) inside **ordinary Chrome** and Player 2 (Client) inside **ordinary Edge**.
3. **Use 127.0.0.1**: Navigate to `http://127.0.0.1:3000` instead of `localhost:3000` to bypass hostname IPv6 resolution delays.
4. **Disable mDNS candidate obfuscation**:
   * **Chrome/Edge**: Visit `chrome://flags` or `edge://flags`, search for **"Anonymize local IPs exposed by WebRTC"**, set it to **"Disabled"**, and relaunch.
   * **Firefox**: Visit `about:config`, search for **"media.peerconnection.ice.obfuscate_host_addresses"**, set it to **"false"**.
