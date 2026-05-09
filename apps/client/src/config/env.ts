type ClientRuntimeEnvironment = "development" | "production" | "test";

type ClientConfig = {
  appEnv: ClientRuntimeEnvironment;
  bffBaseUrl: string;
  internalOrigin: string;
  nodeEnv: ClientRuntimeEnvironment;
  showEnvBadge: boolean;
};

function readEnvironment(value: string | undefined): ClientRuntimeEnvironment {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }

  return "development";
}

function requireUrl(name: string, value: string | undefined, errors: string[]) {
  if (!value?.trim()) {
    errors.push(`${name} is required`);
    return;
  }

  try {
    new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL, received "${value}"`);
  }
}

export function loadClientConfig(
  env: NodeJS.ProcessEnv = process.env
): ClientConfig {
  const nodeEnv = readEnvironment(env.NODE_ENV);
  const appEnv = readEnvironment(
    env.NEXT_PUBLIC_APP_ENV ?? env.APP_ENV ?? env.NODE_ENV
  );
  const bffBaseUrl = env.BFF_BASE_URL ?? "http://localhost:3001";
  const internalOrigin = env.NEXT_INTERNAL_ORIGIN ?? "http://127.0.0.1:3000";
  const showEnvBadge =
    env.NEXT_PUBLIC_SHOW_ENV_BADGE !== "false" && appEnv !== "production";
  const errors: string[] = [];

  requireUrl("BFF_BASE_URL", bffBaseUrl, errors);
  requireUrl("NEXT_INTERNAL_ORIGIN", internalOrigin, errors);

  if (errors.length) {
    throw new Error(`Client configuration error:\n- ${errors.join("\n- ")}`);
  }

  return {
    appEnv,
    bffBaseUrl,
    internalOrigin,
    nodeEnv,
    showEnvBadge
  };
}
