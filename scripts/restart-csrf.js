const { execFileSync, spawn, spawnSync } = require("node:child_process");

const defaultPort = process.env.CSRF_DEMO_PORT ?? "4000";

function listPidsByPattern(pattern) {
  try {
    return execFileSync("pgrep", ["-f", pattern], {
      encoding: "utf8"
    })
      .trim()
      .split("\n")
      .map((value) => value.trim())
      .filter((pid) => pid && pid !== String(process.pid));
  } catch (error) {
    if (error.status === 1) {
      return [];
    }

    throw error;
  }
}

function listPidsByPort(port) {
  try {
    return execFileSync("lsof", ["-ti", `tcp:${port}`], {
      encoding: "utf8"
    })
      .trim()
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
  } catch (error) {
    if (error.status === 1) {
      return [];
    }

    throw error;
  }
}

function stopPids(pids) {
  const uniquePids = [...new Set(pids)].filter(
    (pid) => pid !== String(process.pid)
  );

  if (uniquePids.length === 0) {
    console.log("No existing CSRF demo process found.");
    return;
  }

  const stopped = [];
  const failed = [];

  for (const pid of uniquePids) {
    const result = spawnSync("kill", [pid], { encoding: "utf8" });

    if (result.status === 0) {
      stopped.push(pid);
    } else {
      failed.push(pid);
    }
  }

  if (stopped.length > 0) {
    console.log(`Stopped CSRF demo processes: ${stopped.join(", ")}`);
  }

  if (failed.length > 0) {
    console.log(`Could not stop CSRF demo processes: ${failed.join(", ")}`);
  }
}

stopPids([
  ...listPidsByPattern("scripts/simulate-csrf-attack.js"),
  ...listPidsByPort(defaultPort)
]);

const child = spawn(
  process.platform === "win32" ? "pnpm.cmd" : "pnpm",
  ["simulate:csrf"],
  {
    cwd: process.cwd(),
    env: process.env,
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
