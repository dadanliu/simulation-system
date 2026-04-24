const { spawn } = require("node:child_process");
const readline = require("node:readline");

const services = [
  {
    name: "client",
    packageName: "@next-bff/client",
    url: "http://localhost:3000",
    readyPattern: /Ready in|Local:|started server/i
  },
  {
    name: "bff",
    packageName: "@next-bff/bff",
    url: "http://localhost:3001",
    readyPattern: /Nest application successfully started/i
  },
  {
    name: "server",
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

for (const service of services) {
  const child = spawn("pnpm", ["--filter", service.packageName, "dev"], {
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
