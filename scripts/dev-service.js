const { spawn } = require("node:child_process");

const DEV_MONGODB_URI = "mongodb://127.0.0.1:27017/next-bff-dev";

const serviceName = process.argv[2];
const services = {
  bff: {
    args: ["--filter", "@next-bff/bff", "dev"],
    env: {
      APP_ENV: "development",
      BACKEND_BASE_URL: "http://localhost:3002",
      BFF_PORT: "3001",
      MOCK_SEED_ENABLED: "true",
      MONGODB_URI: DEV_MONGODB_URI,
      REDIS_URL: "redis://127.0.0.1:6379"
    }
  },
  client: {
    args: ["--filter", "@next-bff/client", "dev"],
    env: {
      BFF_BASE_URL: "http://localhost:3001",
      NEXT_INTERNAL_ORIGIN: "http://127.0.0.1:3000",
      NEXT_PUBLIC_APP_ENV: "development",
      NEXT_PUBLIC_SHOW_ENV_BADGE: "true"
    }
  },
  server: {
    args: ["--filter", "@next-bff/server", "dev"],
    env: {
      APP_ENV: "development",
      MOCK_SEED_ENABLED: "true",
      MONGODB_URI: DEV_MONGODB_URI,
      SERVER_PORT: "3002",
      STORAGE_DRIVER: "local"
    }
  }
};

const service = services[serviceName];

if (!service) {
  console.error("Usage: node scripts/dev-service.js <client|bff|server>");
  process.exit(1);
}

const child = spawn("pnpm", service.args, {
  env: {
    ...process.env,
    ...service.env
  },
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exitCode = code ?? 1;
});
