type BffEnvironment = "development" | "production" | "test";

const ENV_FILE_PATHS = [".env.local", ".env", "../../.env.local", "../../.env"];
const DEFAULTS = {
  APP_ENV: "development",
  BFF_PORT: "3001",
  BFF_PUBLIC_BASE_URL: "http://localhost:3001",
  COOKIE_SECURE: undefined,
  CSRF_ALLOWED_ORIGINS: "http://localhost:3000",
  FILE_CACHE_DETAIL_MAX_AGE_SECONDS: "31536000",
  FILE_CACHE_DETAIL_STALE_WHILE_REVALIDATE_SECONDS: "86400",
  FILE_CACHE_PREVIEW_MAX_AGE_SECONDS: "300",
  FILE_CACHE_PREVIEW_STALE_WHILE_REVALIDATE_SECONDS: "60",
  FILE_CACHE_THUMB_MAX_AGE_SECONDS: "31536000",
  FILE_CACHE_THUMB_STALE_WHILE_REVALIDATE_SECONDS: "86400",
  FILE_URL_TTL_SECONDS: "604800",
  FILE_PREVIEW_URL_TTL_SECONDS: "3600",
  LOGIN_FAILURE_WINDOW_SECONDS: "900",
  LOGIN_LOCK_SECONDS: "600",
  LOGIN_MAX_FAILURES_PER_IP: "20",
  LOGIN_MAX_FAILURES_PER_USER: "5",
  FILE_URL_SIGNING_SECRET: "next-bff-dev-file-secret",
  LOG_LEVEL: "log,warn,error",
  MOCK_SEED_ENABLED: undefined,
  NODE_ENV: "development",
  REDIS_URL: "redis://127.0.0.1:6379",
  SESSION_TTL_SECONDS: "86400"
} as const;

type ConfigValue = string | undefined;
type RawConfig = Record<string, ConfigValue>;

function readEnvironment(value: ConfigValue): BffEnvironment {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }

  return DEFAULTS.NODE_ENV;
}

function readAppEnvironment(value: ConfigValue): BffEnvironment {
  return readEnvironment(value);
}

function requireNonEmpty(config: RawConfig, key: string, errors: string[]) {
  if (!config[key]?.trim()) {
    errors.push(`${key} is required`);
  }
}

function requireUrl(config: RawConfig, key: string, errors: string[]) {
  const value = config[key]?.trim();

  if (!value) {
    errors.push(`${key} is required`);
    return;
  }

  try {
    new URL(value);
  } catch {
    errors.push(`${key} must be a valid URL, received "${value}"`);
  }
}

function requirePositiveInteger(config: RawConfig, key: string, errors: string[]) {
  const value = Number(config[key]);

  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${key} must be a positive integer`);
  }
}

function requireBooleanString(config: RawConfig, key: string, errors: string[]) {
  const value = config[key];

  if (value !== undefined && value !== "true" && value !== "false") {
    errors.push(`${key} must be "true" or "false"`);
  }
}

function getDatabaseName(uri: string) {
  try {
    const parsedUrl = new URL(uri);
    const databaseName = parsedUrl.pathname.replace(/^\//, "").split("?")[0];

    return databaseName || "";
  } catch {
    return "";
  }
}

function requireEnvironmentDatabase(config: RawConfig, errors: string[]) {
  const appEnv = config.APP_ENV;
  const mongoUri = config.MONGODB_URI;

  if (!appEnv || !mongoUri) {
    return;
  }

  const databaseName = getDatabaseName(mongoUri);

  if (!databaseName) {
    errors.push("MONGODB_URI must include an explicit database name");
    return;
  }

  if (appEnv === "development" && !databaseName.endsWith("-dev")) {
    errors.push('APP_ENV=development requires MONGODB_URI database name to end with "-dev"');
  }

  if (appEnv === "test" && !databaseName.endsWith("-test")) {
    errors.push('APP_ENV=test requires MONGODB_URI database name to end with "-test"');
  }

  if (appEnv === "production" && /(?:^|[-_])(dev|test|mock)(?:$|[-_])/.test(databaseName)) {
    errors.push("APP_ENV=production must not use a dev/test/mock database name");
  }
}

export function validateBffEnv(input: RawConfig) {
  const config: RawConfig = {
    ...DEFAULTS,
    ...input,
    APP_ENV: readAppEnvironment(input.APP_ENV ?? input.NODE_ENV),
    BFF_PORT: input.BFF_PORT ?? input.PORT ?? DEFAULTS.BFF_PORT,
    NODE_ENV: readEnvironment(input.NODE_ENV)
  };
  const errors: string[] = [];

  requireNonEmpty(config, "MONGODB_URI", errors);
  requireUrl(config, "BACKEND_BASE_URL", errors);
  requireUrl(config, "BFF_PUBLIC_BASE_URL", errors);
  requireUrl(config, "REDIS_URL", errors);
  requirePositiveInteger(config, "BFF_PORT", errors);
  requirePositiveInteger(config, "SESSION_TTL_SECONDS", errors);
  requirePositiveInteger(config, "FILE_CACHE_DETAIL_MAX_AGE_SECONDS", errors);
  requirePositiveInteger(config, "FILE_CACHE_DETAIL_STALE_WHILE_REVALIDATE_SECONDS", errors);
  requirePositiveInteger(config, "FILE_CACHE_PREVIEW_MAX_AGE_SECONDS", errors);
  requirePositiveInteger(config, "FILE_CACHE_PREVIEW_STALE_WHILE_REVALIDATE_SECONDS", errors);
  requirePositiveInteger(config, "FILE_CACHE_THUMB_MAX_AGE_SECONDS", errors);
  requirePositiveInteger(config, "FILE_CACHE_THUMB_STALE_WHILE_REVALIDATE_SECONDS", errors);
  requirePositiveInteger(config, "FILE_PREVIEW_URL_TTL_SECONDS", errors);
  requirePositiveInteger(config, "FILE_URL_TTL_SECONDS", errors);
  requirePositiveInteger(config, "LOGIN_MAX_FAILURES_PER_USER", errors);
  requirePositiveInteger(config, "LOGIN_MAX_FAILURES_PER_IP", errors);
  requirePositiveInteger(config, "LOGIN_FAILURE_WINDOW_SECONDS", errors);
  requirePositiveInteger(config, "LOGIN_LOCK_SECONDS", errors);
  requireBooleanString(config, "COOKIE_SECURE", errors);
  requireBooleanString(config, "MOCK_SEED_ENABLED", errors);
  requireEnvironmentDatabase(config, errors);

  if (config.APP_ENV === "production" && config.MOCK_SEED_ENABLED === "true") {
    errors.push("MOCK_SEED_ENABLED=true is not allowed when APP_ENV=production");
  }

  if (config.APP_ENV === "production" && config.FILE_URL_SIGNING_SECRET === DEFAULTS.FILE_URL_SIGNING_SECRET) {
    errors.push("FILE_URL_SIGNING_SECRET must be overridden when APP_ENV=production");
  }

  if (errors.length) {
    throw new Error(`BFF configuration error:\n- ${errors.join("\n- ")}`);
  }

  return config;
}

export const bffConfigModuleOptions = {
  envFilePath: ENV_FILE_PATHS,
  isGlobal: true,
  validate: validateBffEnv
};
