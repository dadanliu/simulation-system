type BffEnvironment = "development" | "production" | "test";

const ENV_FILE_PATHS = [".env.local", ".env", "../../.env.local", "../../.env"];
const DEFAULTS = {
  BFF_PORT: "3001",
  COOKIE_SECURE: undefined,
  CSRF_ALLOWED_ORIGINS: "http://localhost:3000",
  LOGIN_FAILURE_WINDOW_SECONDS: "900",
  LOGIN_LOCK_SECONDS: "600",
  LOGIN_MAX_FAILURES_PER_IP: "20",
  LOGIN_MAX_FAILURES_PER_USER: "5",
  LOG_LEVEL: "log,warn,error",
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

export function validateBffEnv(input: RawConfig) {
  const config: RawConfig = {
    ...DEFAULTS,
    ...input,
    BFF_PORT: input.BFF_PORT ?? input.PORT ?? DEFAULTS.BFF_PORT,
    NODE_ENV: readEnvironment(input.NODE_ENV)
  };
  const errors: string[] = [];

  requireNonEmpty(config, "MONGODB_URI", errors);
  requireUrl(config, "BACKEND_BASE_URL", errors);
  requireUrl(config, "REDIS_URL", errors);
  requirePositiveInteger(config, "BFF_PORT", errors);
  requirePositiveInteger(config, "SESSION_TTL_SECONDS", errors);
  requirePositiveInteger(config, "LOGIN_MAX_FAILURES_PER_USER", errors);
  requirePositiveInteger(config, "LOGIN_MAX_FAILURES_PER_IP", errors);
  requirePositiveInteger(config, "LOGIN_FAILURE_WINDOW_SECONDS", errors);
  requirePositiveInteger(config, "LOGIN_LOCK_SECONDS", errors);
  requireBooleanString(config, "COOKIE_SECURE", errors);

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
