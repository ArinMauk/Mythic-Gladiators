const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

// 1. Resolve Node 22 binary dynamically without hardcoding system paths
let nodePath = "node"; // Fallback to standard system node

if (process.platform === "win32") {
  const localAppData = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, "AppData", "Local") : "");
  
  const possiblePaths = [
    process.env.MYTHIC_GLADIATORS_NODE_V22,
    localAppData ? path.join(localAppData, "nvm", "v22.12.0", "node.exe") : "",
    process.env.NVM_HOME ? path.join(process.env.NVM_HOME, "v22.12.0", "node.exe") : "",
  ].filter(Boolean);

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      nodePath = p;
      break;
    }
  }
}

// 2. Spawn Next.js under resolved Node binary
const action = process.argv[2] || "dev";
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

console.log(`[Mythic Gladiators Environment Isolation]`);
console.log(`Active Node binary: ${nodePath}`);
console.log(`Executing command: next ${action}\n`);

const child = spawn(nodePath, [nextBin, action], {
  stdio: "inherit",
  shell: false
});

// Ensure child process is killed when parent exits
const killChild = () => {
  if (child && !child.killed) {
    try {
      child.kill();
    } catch (e) {
      // Ignore
    }
  }
};

process.on("exit", killChild);
process.on("SIGINT", () => {
  killChild();
  process.exit(0);
});
process.on("SIGTERM", () => {
  killChild();
  process.exit(0);
});
process.on("uncaughtException", (err) => {
  console.error(err);
  killChild();
  process.exit(1);
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
