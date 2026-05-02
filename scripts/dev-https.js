const { execFileSync, spawn } = require("node:child_process");
const { existsSync, mkdirSync } = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");

const rootDir = process.cwd();
const certDir = path.join(rootDir, ".cert");
const keyPath = path.join(certDir, "localhost-key.pem");
const certPath = path.join(certDir, "localhost-cert.pem");

const services = [
  {
    args: [
      "--filter",
      "@next-bff/client",
      "exec",
      "next",
      "dev",
      "--experimental-https",
      "--experimental-https-key",
      keyPath,
      "--experimental-https-cert",
      certPath
    ],
    env: {
      NEXT_INTERNAL_ORIGIN: "https://localhost:3000",
      // Local self-signed HTTPS is only for development. Browser traffic is still protected by HTTPS,
      // but Node's server-side fetch needs this to call the local Next HTTPS origin.
      NODE_TLS_REJECT_UNAUTHORIZED: "0"
    },
    name: "client",
    readyPattern: /Ready in|Local:|started server/i,
    url: "https://localhost:3000"
  },
  {
    args: ["--filter", "@next-bff/bff", "dev"],
    env: {
      COOKIE_SECURE: "true"
    },
    name: "bff",
    readyPattern: /Nest application successfully started/i,
    url: "http://localhost:3001"
  },
  {
    args: ["--filter", "@next-bff/server", "dev"],
    env: {},
    name: "server",
    readyPattern: /Nest application successfully started/i,
    url: "http://localhost:3002"
  }
];

const readyServices = new Set();
const children = [];
let printedAccessInfo = false;
let isShuttingDown = false;

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

function assertRequiredPortsAvailable() {
  const busyPorts = [3000, 3001, 3002]
    .map((port) => ({
      pids: listPidsByPort(port),
      port
    }))
    .filter((item) => item.pids.length > 0);

  if (busyPorts.length === 0) {
    return;
  }

  console.error("Cannot start HTTPS dev services because required ports are in use:");

  for (const item of busyPorts) {
    console.error(`- port ${item.port}: ${item.pids.join(", ")}`);
  }

  console.error("");
  console.error("Run `pnpm stop:all` first, then run `pnpm dev:https` again.");
  process.exit(1);
}

function ensureLocalCertificate() {
  if (existsSync(keyPath) && existsSync(certPath)) {
    return;
  }

  mkdirSync(certDir, { recursive: true });
  console.log(`Generating local HTTPS certificate in ${certDir}`);

  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "365",
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost,IP:127.0.0.1"
    ],
    {
      stdio: "inherit"
    }
  );
}

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
  console.log("HTTPS dev services are ready:");
  console.log(`- client: ${services.find((service) => service.name === "client").url}`);
  console.log(`- bff:    ${services.find((service) => service.name === "bff").url} (internal)`);
  console.log(`- server: ${services.find((service) => service.name === "server").url} (internal)`);
  console.log("");
  console.log("Open https://localhost:3000 and accept the local self-signed certificate if prompted.");
  console.log("BFF sets COOKIE_SECURE=true in this mode, so next_bff_session should show Secure in DevTools.");
  console.log("");
}

function markReady(service) {
  if (readyServices.has(service.name)) {
    return;
  }

  readyServices.add(service.name);
  printAccessInfo();
}

function pipeWithPrefix(stream, service) {
  const reader = readline.createInterface({ input: stream });

  reader.on("line", (line) => {
    prefixLine(service.name, line);

    if (service.readyPattern.test(line)) {
      markReady(service);
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

assertRequiredPortsAvailable();
ensureLocalCertificate();

for (const service of services) {
  const child = spawn("pnpm", service.args, {
    env: {
      ...process.env,
      ...service.env
    },
    stdio: ["inherit", "pipe", "pipe"]
  });

  children.push(child);
  pipeWithPrefix(child.stdout, service);
  pipeWithPrefix(child.stderr, service);

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

process.on("SIGINT", () => {
  stopChildren("SIGINT");
});

process.on("SIGTERM", () => {
  stopChildren("SIGTERM");
});
