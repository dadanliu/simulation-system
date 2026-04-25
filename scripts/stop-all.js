const { execFileSync, spawnSync } = require("node:child_process");

const ports = [3000, 3001, 3002];

function listPids() {
  const pids = new Set();

  for (const port of ports) {
    try {
      const output = execFileSync("lsof", ["-ti", `tcp:${port}`], {
        encoding: "utf8"
      }).trim();

      for (const pid of output.split("\n").map((value) => value.trim()).filter(Boolean)) {
        pids.add(pid);
      }
    } catch (error) {
      if (error.status === 1) {
        continue;
      }

      throw error;
    }
  }

  return [...pids];
}

const pids = listPids();

if (pids.length === 0) {
  console.log("No processes found on ports 3000, 3001, 3002.");
  process.exit(0);
}

const stopped = [];
const failed = [];

for (const pid of pids) {
  const result = spawnSync("kill", [pid], { encoding: "utf8" });

  if (result.status === 0) {
    stopped.push(pid);
    continue;
  }

  failed.push(pid);
}

if (stopped.length > 0) {
  console.log(`Stopped processes: ${stopped.join(", ")}`);
}

if (failed.length > 0) {
  console.log(`Could not stop processes: ${failed.join(", ")}`);
}
