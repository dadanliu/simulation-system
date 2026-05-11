type ClientRuntimeEnvironment = "development" | "production" | "test";

type ClientConfig = {
  appEnv: ClientRuntimeEnvironment;
  appVersion: string;
  bffBaseUrl: string;
  internalOrigin: string;
  nodeEnv: ClientRuntimeEnvironment;
  releaseCommitSha: string;
  releaseNotesUrl?: string;
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

function requireOptionalUrl(
  name: string,
  value: string | undefined,
  errors: string[]
) {
  if (!value?.trim()) {
    return;
  }

  try {
    new URL(value);
  } catch {
    errors.push(`${name} must be a valid URL, received "${value}"`);
  }
}

function requireExplicitProductionValue(
  name: string,
  value: string | undefined,
  errors: string[]
) {
  if (!value?.trim()) {
    errors.push(`${name} is required when APP_ENV=production`);
  }
}

export function loadClientConfig(
  env: NodeJS.ProcessEnv = process.env
): ClientConfig {
  const nodeEnv = readEnvironment(env.NODE_ENV);
  const appEnv = readEnvironment(
    env.NEXT_PUBLIC_APP_ENV ?? env.APP_ENV ?? "development"
  );
  const appVersion = env.NEXT_PUBLIC_APP_VERSION ?? env.APP_VERSION ?? "local";
  const releaseCommitSha =
    env.NEXT_PUBLIC_RELEASE_COMMIT_SHA ??
    env.RELEASE_COMMIT_SHA ??
    env.VERCEL_GIT_COMMIT_SHA ??
    env.GITHUB_SHA ??
    "local";
  const releaseNotesUrl =
    env.NEXT_PUBLIC_RELEASE_NOTES_URL ?? env.RELEASE_NOTES_URL;
  const bffBaseUrl = env.BFF_BASE_URL ?? "http://localhost:3001";
  const internalOrigin = env.NEXT_INTERNAL_ORIGIN ?? "http://127.0.0.1:3000";
  const showEnvBadge =
    env.NEXT_PUBLIC_SHOW_ENV_BADGE !== "false" && appEnv !== "production";
  const errors: string[] = [];

  if (appEnv === "production") {
    requireExplicitProductionValue(
      "NEXT_PUBLIC_APP_VERSION",
      env.NEXT_PUBLIC_APP_VERSION,
      errors
    );
    requireExplicitProductionValue(
      "NEXT_PUBLIC_RELEASE_COMMIT_SHA",
      env.NEXT_PUBLIC_RELEASE_COMMIT_SHA,
      errors
    );
    requireExplicitProductionValue("BFF_BASE_URL", env.BFF_BASE_URL, errors);
    requireExplicitProductionValue(
      "NEXT_INTERNAL_ORIGIN",
      env.NEXT_INTERNAL_ORIGIN,
      errors
    );
  }

  requireUrl("BFF_BASE_URL", bffBaseUrl, errors);
  requireUrl("NEXT_INTERNAL_ORIGIN", internalOrigin, errors);
  requireOptionalUrl("NEXT_PUBLIC_RELEASE_NOTES_URL", releaseNotesUrl, errors);

  if (errors.length) {
    throw new Error(`Client configuration error:\n- ${errors.join("\n- ")}`);
  }

  return {
    appEnv,
    appVersion,
    bffBaseUrl,
    internalOrigin,
    nodeEnv,
    releaseCommitSha,
    releaseNotesUrl,
    showEnvBadge
  };
}
