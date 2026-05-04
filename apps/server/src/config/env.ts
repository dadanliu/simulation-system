type ServerEnvironment = "development" | "production" | "test";

const ENV_FILE_PATHS = [".env.local", ".env", "../../.env.local", "../../.env"];
const DEFAULTS = {
  LOG_LEVEL: "log,warn,error",
  NODE_ENV: "development",
  SERVER_PORT: "3002",
  STORAGE_DRIVER: "local"
} as const;

type ConfigValue = string | undefined;
type RawConfig = Record<string, ConfigValue>;

function readEnvironment(value: ConfigValue): ServerEnvironment {
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

function requirePositiveInteger(config: RawConfig, key: string, errors: string[]) {
  const value = Number(config[key]);

  if (!Number.isInteger(value) || value <= 0) {
    errors.push(`${key} must be a positive integer`);
  }
}

function requireStorageDriver(config: RawConfig, errors: string[]) {
  const value = config.STORAGE_DRIVER;

  if (value !== "local" && value !== "s3" && value !== "oss") {
    errors.push('STORAGE_DRIVER must be one of "local", "s3", "oss"');
  }
}

export function validateServerEnv(input: RawConfig) {
  const config: RawConfig = {
    ...DEFAULTS,
    ...input,
    SERVER_PORT: input.SERVER_PORT ?? input.PORT ?? DEFAULTS.SERVER_PORT,
    NODE_ENV: readEnvironment(input.NODE_ENV)
  };
  const errors: string[] = [];

  requireNonEmpty(config, "MONGODB_URI", errors);
  requirePositiveInteger(config, "SERVER_PORT", errors);
  requireStorageDriver(config, errors);

  if (errors.length) {
    throw new Error(`Backend configuration error:\n- ${errors.join("\n- ")}`);
  }

  return config;
}

export const serverConfigModuleOptions = {
  envFilePath: ENV_FILE_PATHS,
  isGlobal: true,
  validate: validateServerEnv
};
