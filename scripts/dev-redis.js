const { spawn, spawnSync } = require("node:child_process");
const net = require("node:net");

const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);
const REDIS_HOST = process.env.REDIS_HOST ?? "127.0.0.1";
const DOCKER_CONTAINER_NAME = process.env.REDIS_DOCKER_CONTAINER_NAME ?? "next-bff-redis";
const DOCKER_IMAGE = process.env.REDIS_DOCKER_IMAGE ?? "redis:7-alpine";

let child;
let startedDocker = false;
let isReady = false;

function commandExists(command) {
  const result = spawnSync("command", ["-v", command], {
    shell: true,
    stdio: "ignore"
  });

  return result.status === 0;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = net.createConnection({
      host: REDIS_HOST,
      port: REDIS_PORT,
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
  for (let attempt = 0; attempt < 180; attempt += 1) {
    if (await canConnect()) {
      isReady = true;
      console.log(`Redis ready at ${REDIS_HOST}:${REDIS_PORT}`);
      return;
    }

    await wait(500);
  }

  throw new Error(`Redis did not become ready at ${REDIS_HOST}:${REDIS_PORT}`);
}

function keepAliveForExistingRedis() {
  isReady = true;
  console.log(`Using existing Redis at ${REDIS_HOST}:${REDIS_PORT}`);
  setInterval(() => {}, 60_000);
}

function startLocalRedisServer() {
  console.log(`Starting redis-server at ${REDIS_HOST}:${REDIS_PORT}`);

  return spawn(
    "redis-server",
    ["--bind", REDIS_HOST, "--port", String(REDIS_PORT), "--save", "", "--appendonly", "no"],
    {
      stdio: ["ignore", "pipe", "pipe"]
    }
  );
}

function removeStaleDockerContainer() {
  spawnSync("docker", ["rm", "-f", DOCKER_CONTAINER_NAME], {
    stdio: "ignore"
  });
}

function startDockerRedis() {
  console.log(`Starting Docker Redis ${DOCKER_CONTAINER_NAME} from ${DOCKER_IMAGE}`);
  removeStaleDockerContainer();
  startedDocker = true;

  return spawn(
    "docker",
    ["run", "--rm", "--name", DOCKER_CONTAINER_NAME, "-p", `${REDIS_PORT}:6379`, DOCKER_IMAGE],
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

  if (startedDocker) {
    spawnSync("docker", ["rm", "-f", DOCKER_CONTAINER_NAME], {
      stdio: "ignore"
    });
  }
}

async function main() {
  if (await canConnect()) {
    keepAliveForExistingRedis();
    return;
  }

  if (commandExists("redis-server")) {
    child = startLocalRedisServer();
  } else if (commandExists("docker")) {
    child = startDockerRedis();
  } else {
    console.error("Redis is required for BFF sessions, but neither redis-server nor docker was found.");
    console.error("Install Redis, start a Redis instance at 127.0.0.1:6379, or set REDIS_URL for the BFF.");
    process.exit(1);
  }

  pipeOutput(child);
  const childExitPromise = new Promise((_, reject) => {
    child.on("exit", (code, signal) => {
      const reason = signal ? `signal ${signal}` : `code ${code}`;

      if (!isReady) {
        reject(new Error(`Redis process exited before becoming ready with ${reason}`));
        return;
      }

      console.error(`Redis process exited with ${reason}`);
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
  if (startedDocker) {
    console.error("If you want dev:redis to manage Redis with Docker, start Docker Desktop and rerun pnpm dev:redis.");
  }
  console.error("Alternatively, install redis-server or run your own Redis and set REDIS_URL if it is not 127.0.0.1:6379.");
  stop();
  process.exit(1);
});
