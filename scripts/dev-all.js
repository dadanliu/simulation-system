const { spawn } = require("node:child_process");
const readline = require("node:readline");

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
    readyPattern: /Nest application successfully started/i
  }
];

const readyServices = new Set();
const children = [];
let printedAccessInfo = false;
let isShuttingDown = false;

function prefixLine(serviceName, line) {
  if (!line) {
    return;
  }

  console.log(`[${serviceName}] ${line}`);
}

function printAccessInfo() {
  if (printedAccessInfo || !readyServices.has("client") || !readyServices.has("bff")) {
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
      markReady(service);
      onReady?.();
    }
  });
}

function stopChildren(signal = "SIGTERM") {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
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

function bindLifecycle(child, service) {
  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[${service.name}] exited with ${reason}`);
    stopChildren();
    process.exitCode = code ?? 1;
  });

  child.on("error", (error) => {
    console.error(`[${service.name}] failed to start: ${error.message}`);
    stopChildren();
    process.exitCode = 1;
  });
}

function startService(service) {
  const child = spawnService(service);

  children.push(child);
  pipeWithPrefix(child.stdout, service);
  pipeWithPrefix(child.stderr, service);
  bindLifecycle(child, service);
}

function startServiceAndWait(service) {
  return new Promise((resolve, reject) => {
    const child = spawnService(service);
    let isReady = false;

    children.push(child);
    pipeWithPrefix(child.stdout, service, () => {
      if (!isReady) {
        isReady = true;
        resolve();
      }
    });
    pipeWithPrefix(child.stderr, service, () => {
      if (!isReady) {
        isReady = true;
        resolve();
      }
    });

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

  await startServiceAndWait(mongoService);
  await startServiceAndWait(redisService);

  for (const service of appServices) {
    startService(service);
  }
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
