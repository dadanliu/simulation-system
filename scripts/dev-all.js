const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const https = require("node:https");
const net = require("node:net");
const path = require("node:path");
const readline = require("node:readline");

const STATE_DIR = path.resolve(".dev");
const STATE_FILE = path.join(STATE_DIR, "dev-all.json");
const READY_TIMEOUT_MS = 60_000;
const RESERVED_APP_PORTS = [
  {
    name: "client",
    port: 3000
  },
  {
    name: "bff",
    port: 3001
  },
  {
    name: "server",
    port: 3002
  }
];

const services = [
  {
    name: "mongo",
    command: "node",
    args: ["scripts/dev-mongo.js"],
    url: "mongodb://127.0.0.1:27017/next-bff",
    readyPattern: /MongoDB ready|Using existing MongoDB/i
  },
  {
    name: "redis",
    command: "node",
    args: ["scripts/dev-redis.js"],
    url: "redis://127.0.0.1:6379",
    readyPattern: /Redis ready|Using existing Redis/i
  },
  {
    name: "client",
    env: {
      BFF_BASE_URL: "http://localhost:3001",
      NEXT_INTERNAL_ORIGIN: "http://127.0.0.1:3000"
    },
    packageName: "@next-bff/client",
    url: "http://localhost:3000",
    healthUrl: "http://127.0.0.1:3000/login",
    readyPattern: /Ready in|Local:|started server/i
  },
  {
    name: "bff",
    env: {
      BACKEND_BASE_URL: "http://localhost:3002",
      BFF_PORT: "3001",
      MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff",
      REDIS_URL: "redis://127.0.0.1:6379"
    },
    packageName: "@next-bff/bff",
    url: "http://localhost:3001",
    healthUrl: "http://127.0.0.1:3001/",
    readyPattern: /Nest application successfully started/i
  },
  {
    name: "server",
    env: {
      MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff",
      SERVER_PORT: "3002",
      STORAGE_DRIVER: "local"
    },
    packageName: "@next-bff/server",
    url: "http://localhost:3002",
    healthUrl: "http://127.0.0.1:3002/",
    readyPattern: /Nest application successfully started/i
  }
];

const readyServices = new Set();
const children = [];
let printedAccessInfo = false;
let isShuttingDown = false;

function writeState() {
  fs.mkdirSync(STATE_DIR, {
    recursive: true
  });
  fs.writeFileSync(
    STATE_FILE,
    JSON.stringify(
      {
        pid: process.pid,
        services: children.map((item) => ({
          name: item.service.name,
          pid: item.child.pid
        })),
        startedAt: new Date().toISOString()
      },
      null,
      2
    )
  );
}

function removeState() {
  fs.rmSync(STATE_FILE, {
    force: true
  });
}

function prefixLine(serviceName, line) {
  if (!line) {
    return;
  }

  console.log(`[${serviceName}] ${line}`);
}

function printAccessInfo() {
  if (printedAccessInfo || services.some((service) => !readyServices.has(service.name))) {
    return;
  }

  printedAccessInfo = true;

  console.log("");
  console.log("Dev services are ready:");
  console.log(`- client: ${services.find((service) => service.name === "client").url}`);
  console.log(`- bff:    ${services.find((service) => service.name === "bff").url}`);
  console.log(`- server: ${services.find((service) => service.name === "server").url}`);
  console.log(`- mongo:  ${services.find((service) => service.name === "mongo").url}`);
  console.log(`- redis:  ${services.find((service) => service.name === "redis").url}`);
  console.log("");
}

function markReady(service) {
  if (readyServices.has(service.name)) {
    return;
  }

  readyServices.add(service.name);
  printAccessInfo();
}

function pipeWithPrefix(stream, service, onReady) {
  const reader = readline.createInterface({ input: stream });

  reader.on("line", (line) => {
    prefixLine(service.name, line);

    if (service.readyPattern.test(line)) {
      onReady?.();
    }
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnectPort(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: "127.0.0.1",
      port,
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

async function assertAppPortsAvailable() {
  const occupied = [];

  for (const item of RESERVED_APP_PORTS) {
    if (await canConnectPort(item.port)) {
      occupied.push(`${item.name}:${item.port}`);
    }
  }

  if (occupied.length > 0) {
    throw new Error(`Ports already in use (${occupied.join(", ")}). Run pnpm stop:all and retry pnpm dev:all.`);
  }
}

function requestHealth(url) {
  return new Promise((resolve) => {
    const client = url.startsWith("https:") ? https : http;
    const request = client.get(url, { timeout: 1_000 }, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForHealth(service) {
  if (!service.healthUrl) {
    return;
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (await requestHealth(service.healthUrl)) {
      return;
    }

    await wait(500);
  }

  throw new Error(`[${service.name}] did not pass health check at ${service.healthUrl} within ${READY_TIMEOUT_MS}ms`);
}

function stopChildren(signal = "SIGTERM") {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const item of children) {
    if (!item.child.killed) {
      item.child.kill(signal);
    }
  }

  removeState();
}

function spawnService(service) {
  return spawn(service.command ?? "pnpm", service.args ?? ["--filter", service.packageName, "dev"], {
    env: {
      ...process.env,
      ...service.env
    },
    stdio: ["inherit", "pipe", "pipe"]
  });
}

function startServiceAndWait(service) {
  return new Promise((resolve, reject) => {
    const child = spawnService(service);
    let isReady = false;

    children.push({
      child,
      service
    });
    writeState();

    const resolveReady = async () => {
      if (!isReady) {
        try {
          await waitForHealth(service);
          isReady = true;
          markReady(service);
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    };

    pipeWithPrefix(child.stdout, service, resolveReady);
    pipeWithPrefix(child.stderr, service, resolveReady);

    child.on("exit", (code, signal) => {
      if (isShuttingDown) {
        return;
      }

      const reason = signal ? `signal ${signal}` : `code ${code}`;

      if (!isReady) {
        reject(new Error(`[${service.name}] exited before ready with ${reason}`));
        return;
      }

      console.error(`[${service.name}] exited with ${reason}`);
      stopChildren();
      process.exitCode = code ?? 1;
    });

    child.on("error", (error) => {
      reject(new Error(`[${service.name}] failed to start: ${error.message}`));
    });
  });
}

async function main() {
  const [mongoService, redisService, ...appServices] = services;

  await assertAppPortsAvailable();
  await startServiceAndWait(mongoService);
  await startServiceAndWait(redisService);

  await Promise.all(appServices.map((service) => startServiceAndWait(service)));
}

main().catch((error) => {
  console.error(error.message);
  stopChildren();
  process.exitCode = 1;
});

process.on("SIGINT", () => {
  stopChildren("SIGINT");
});

process.on("SIGTERM", () => {
  stopChildren("SIGTERM");
});
