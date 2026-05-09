const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const E2E_MONGODB_URI =
  process.env.E2E_MONGODB_URI ?? "mongodb://127.0.0.1:27018/next-bff-test";
const E2E_REDIS_URL = process.env.E2E_REDIS_URL ?? "redis://127.0.0.1:6379";
const E2E_DIR = path.resolve(".dev/e2e");
const mongoUrl = new URL(E2E_MONGODB_URI);

const services = [
  {
    name: "mongo",
    command: "node",
    args: ["scripts/dev-mongo.js"],
    env: {
      MONGO_DB_PATH: path.join(E2E_DIR, "mongo"),
      MONGO_HOST: mongoUrl.hostname,
      MONGO_PORT: mongoUrl.port || "27017"
    }
  },
  {
    name: "redis",
    command: "node",
    args: ["scripts/dev-redis.js"]
  },
  {
    name: "server",
    command: "pnpm",
    args: ["--filter", "@next-bff/server", "dev"],
    env: {
      APP_ENV: "test",
      E2E_TEST_RESET_ENABLED: "true",
      LOCAL_UPLOAD_DIR: path.join(E2E_DIR, "uploads"),
      LOCAL_UPLOAD_PUBLIC_BASE_URL: "http://127.0.0.1:3202/uploads",
      MOCK_SEED_ENABLED: "true",
      MONGODB_URI: E2E_MONGODB_URI,
      SERVER_PORT: "3202",
      STORAGE_DRIVER: "local",
      UPLOAD_REGISTRY_PATH: path.join(E2E_DIR, "upload-registry.json")
    }
  },
  {
    name: "bff",
    command: "pnpm",
    args: ["--filter", "@next-bff/bff", "dev"],
    env: {
      APP_ENV: "test",
      BACKEND_BASE_URL: "http://127.0.0.1:3202",
      BFF_PORT: "3201",
      BFF_PUBLIC_BASE_URL: "http://127.0.0.1:3201",
      COOKIE_SECURE: "false",
      CSRF_ALLOWED_ORIGINS: "http://127.0.0.1:3200,http://localhost:3200",
      E2E_TEST_RESET_ENABLED: "true",
      MOCK_SEED_ENABLED: "true",
      MONGODB_URI: E2E_MONGODB_URI,
      REDIS_URL: E2E_REDIS_URL
    }
  },
  {
    name: "client",
    command: "pnpm",
    args: [
      "--filter",
      "@next-bff/client",
      "exec",
      "next",
      "dev",
      "-H",
      "127.0.0.1",
      "-p",
      "3200"
    ],
    env: {
      BFF_BASE_URL: "http://127.0.0.1:3201",
      NEXT_INTERNAL_ORIGIN: "http://127.0.0.1:3200",
      NEXT_PUBLIC_APP_ENV: "test",
      NEXT_PUBLIC_SHOW_ENV_BADGE: "false"
    }
  }
];

const children = [];
let shuttingDown = false;

fs.mkdirSync(E2E_DIR, { recursive: true });

function stop(signal = "SIGTERM") {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

for (const service of services) {
  const child = spawn(service.command, service.args, {
    env: {
      ...process.env,
      ...service.env
    },
    stdio: "inherit"
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (shuttingDown) {
      return;
    }

    if (code !== null && code !== 0) {
      console.error(`[${service.name}] exited with code ${code}`);
      stop();
      process.exitCode = code;
    }

    if (signal) {
      console.error(`[${service.name}] exited with signal ${signal}`);
      stop(signal);
    }
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("exit", () => stop());
