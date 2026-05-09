const { execFileSync, spawn, spawnSync } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const PORTS = [3000, 3001, 3002];
const STATE_FILE = path.resolve(".dev", "dev-all.json");
const STOP_TIMEOUT_MS = 8_000;

function readManagedPids() {
  try {
    const state = JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    const parentPid = state.pid ? [String(state.pid)] : [];
    const servicePids = Array.isArray(state.services)
      ? state.services.map((service) => String(service.pid)).filter(Boolean)
      : [];

    return [...new Set([...servicePids, ...parentPid])];
  } catch {
    return [];
  }
}

function listPortPids() {
  const pids = new Set();

  for (const port of PORTS) {
    try {
      const output = execFileSync("lsof", ["-ti", `tcp:${port}`], {
        encoding: "utf8"
      }).trim();

      for (const pid of output
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean)) {
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

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port,
      timeout: 300
    });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killPids(pids, signal) {
  const failed = [];

  for (const pid of pids) {
    const result = spawnSync("kill", [`-${signal}`, pid], {
      encoding: "utf8"
    });

    if (result.status !== 0) {
      failed.push(pid);
    }
  }

  return failed;
}

async function waitForPortsToClose() {
  const startedAt = Date.now();

  while (Date.now() - startedAt < STOP_TIMEOUT_MS) {
    const openPorts = [];

    for (const port of PORTS) {
      if (await isPortOpen(port)) {
        openPorts.push(port);
      }
    }

    if (openPorts.length === 0) {
      return true;
    }

    await sleep(300);
  }

  return false;
}

async function stopDevServices() {
  const initialPids = [...new Set([...readManagedPids(), ...listPortPids()])];

  if (initialPids.length === 0) {
    console.log("No existing dev services found on ports 3000, 3001, 3002.");
    fs.rmSync(STATE_FILE, { force: true });
    return;
  }

  console.log(`Stopping existing dev services: ${initialPids.join(", ")}`);
  killPids(initialPids, "TERM");

  if (await waitForPortsToClose()) {
    fs.rmSync(STATE_FILE, { force: true });
    return;
  }

  const remainingPids = listPortPids();

  if (remainingPids.length > 0) {
    console.log(
      `Force stopping remaining dev services: ${remainingPids.join(", ")}`
    );
    const failed = killPids(remainingPids, "KILL");

    if (failed.length > 0) {
      throw new Error(`Could not stop processes: ${failed.join(", ")}`);
    }
  }

  if (!(await waitForPortsToClose())) {
    throw new Error(
      "Ports 3000, 3001, or 3002 are still in use after restart cleanup."
    );
  }

  fs.rmSync(STATE_FILE, { force: true });
}

function startDevAll() {
  const child = spawn(
    process.platform === "win32" ? "pnpm.cmd" : "pnpm",
    ["dev:all"],
    {
      cwd: process.cwd(),
      stdio: "inherit"
    }
  );

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

async function main() {
  await stopDevServices();
  startDevAll();
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
