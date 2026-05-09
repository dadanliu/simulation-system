const { spawn } = require("node:child_process");
const fs = require("node:fs");
const net = require("node:net");
const path = require("node:path");

const MONGO_HOST = process.env.MONGO_HOST ?? "127.0.0.1";
const MONGO_PORT = Number(process.env.MONGO_PORT ?? 27017);
const MONGO_DB_PATH = process.env.MONGO_DB_PATH ?? "/tmp/next-bff-mongo";

let child;
let isReady = false;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: MONGO_HOST,
      port: MONGO_PORT,
      timeout: 500
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

async function waitUntilReady() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await canConnect()) {
      isReady = true;
      console.log(`MongoDB ready at ${MONGO_HOST}:${MONGO_PORT}`);
      return;
    }

    await wait(500);
  }

  throw new Error(
    `MongoDB did not become ready at ${MONGO_HOST}:${MONGO_PORT}`
  );
}

function keepAliveForExistingMongo() {
  isReady = true;
  console.log(`Using existing MongoDB at ${MONGO_HOST}:${MONGO_PORT}`);
  setInterval(() => {}, 60_000);
}

function ensureDbPath() {
  fs.mkdirSync(path.resolve(MONGO_DB_PATH), {
    recursive: true
  });
}

function startMongo() {
  ensureDbPath();
  console.log(`Starting mongod at ${MONGO_HOST}:${MONGO_PORT}`);

  return spawn(
    "mongod",
    [
      "--dbpath",
      MONGO_DB_PATH,
      "--bind_ip",
      MONGO_HOST,
      "--port",
      String(MONGO_PORT)
    ],
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

function pipeOutput(childProcess) {
  childProcess.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });
  childProcess.stderr.on("data", (chunk) => {
    process.stderr.write(chunk);
  });
}

function stop() {
  if (child && !child.killed) {
    child.kill("SIGTERM");
  }
}

async function main() {
  if (await canConnect()) {
    keepAliveForExistingMongo();
    return;
  }

  child = startMongo();
  pipeOutput(child);

  const childExitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code}`;

      if (!isReady) {
        reject(
          new Error(
            `MongoDB process exited before becoming ready with ${reason}`
          )
        );
        return;
      }

      console.error(`MongoDB process exited with ${reason}`);
      process.exitCode = code ?? 1;
    });
  });

  await Promise.race([waitUntilReady(), childExitPromise]);
}

process.on("SIGINT", () => {
  stop();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stop();
  process.exit(0);
});

main().catch((error) => {
  console.error(error.message);
  console.error(
    "Install MongoDB, start MongoDB at 127.0.0.1:27017, or set MONGODB_URI for BFF/server."
  );
  stop();
  process.exit(1);
});
