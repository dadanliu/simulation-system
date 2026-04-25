const { execFileSync, spawn } = require("node:child_process");

function stopAll() {
  execFileSync(process.execPath, ["scripts/stop-all.js"], {
    cwd: process.cwd(),
    stdio: "inherit"
  });
}

stopAll();

const child = spawn(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["dev:all"], {
  cwd: process.cwd(),
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
