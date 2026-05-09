type ServerEnvironment = "development" | "production" | "test";

const ENV_FILE_PATHS = [".env.local", ".env", "../../.env.local", "../../.env"];
const DEFAULTS = {
  APP_ENV: "development",
  LOCAL_UPLOAD_DIR: ".dev/uploads",
  LOCAL_UPLOAD_PUBLIC_BASE_URL: "http://localhost:3002/uploads",
  LOG_LEVEL: "log,warn,error",
  MOCK_SEED_ENABLED: undefined,
  NODE_ENV: "development",
  SERVER_PORT: "3002",
  STORAGE_DRIVER: "local",
  UPLOAD_REGISTRY_PATH: ".dev/upload-registry.json"
} as const;

type ConfigValue = string | undefined;
type RawConfig = Record<string, ConfigValue>;

function readEnvironment(value: ConfigValue): ServerEnvironment {
  if (value === "development" || value === "production" || value === "test") {
    return value;
  }

  return DEFAULTS.NODE_ENV;
}

function readAppEnvironment(value: ConfigValue): ServerEnvironment {
  return readEnvironment(value);
}

function requireNonEmpty(config: RawConfig, key: string, errors: string[]) {
  if (!config[key]?.trim()) {
    errors.push(`${key} is required`);
  }
}

function requirePositiveInteger(
  config: RawConfig,
  key: string,
  errors: string[]
) {
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

function requireObjectStorageConfig(config: RawConfig, errors: string[]) {
  if (config.STORAGE_DRIVER === "s3") {
    requireNonEmpty(config, "S3_BUCKET", errors);
    requireNonEmpty(config, "S3_REGION", errors);
    requireNonEmpty(config, "S3_ACCESS_KEY_ID", errors);
    requireNonEmpty(config, "S3_SECRET_ACCESS_KEY", errors);
    return;
  }

  if (config.STORAGE_DRIVER === "oss") {
    requireNonEmpty(config, "OSS_BUCKET", errors);
    requireNonEmpty(config, "OSS_REGION", errors);
    requireNonEmpty(config, "OSS_ACCESS_KEY_ID", errors);
    requireNonEmpty(config, "OSS_ACCESS_KEY_SECRET", errors);
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

function requireOptionalUrl(config: RawConfig, key: string, errors: string[]) {
  const value = config[key]?.trim();

  if (!value) {
    return;
  }

  try {
    new URL(value);
  } catch {
    errors.push(`${key} must be a valid URL, received "${value}"`);
  }
}

function requireBooleanString(
  config: RawConfig,
  key: string,
  errors: string[]
) {
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
    errors.push(
      'APP_ENV=development requires MONGODB_URI database name to end with "-dev"'
    );
  }

  if (appEnv === "test" && !databaseName.endsWith("-test")) {
    errors.push(
      'APP_ENV=test requires MONGODB_URI database name to end with "-test"'
    );
  }

  if (
    appEnv === "production" &&
    /(?:^|[-_])(dev|test|mock)(?:$|[-_])/.test(databaseName)
  ) {
    errors.push(
      "APP_ENV=production must not use a dev/test/mock database name"
    );
  }
}

export function validateServerEnv(input: RawConfig) {
  const config: RawConfig = {
    ...DEFAULTS,
    ...input,
    APP_ENV: readAppEnvironment(input.APP_ENV ?? input.NODE_ENV),
    SERVER_PORT: input.SERVER_PORT ?? input.PORT ?? DEFAULTS.SERVER_PORT,
    NODE_ENV: readEnvironment(input.NODE_ENV)
  };
  const errors: string[] = [];

  requireNonEmpty(config, "MONGODB_URI", errors);
  requirePositiveInteger(config, "SERVER_PORT", errors);
  requireStorageDriver(config, errors);
  requireBooleanString(config, "MOCK_SEED_ENABLED", errors);
  requireEnvironmentDatabase(config, errors);
  requireUrl(config, "LOCAL_UPLOAD_PUBLIC_BASE_URL", errors);
  requireOptionalUrl(config, "S3_PUBLIC_BASE_URL", errors);
  requireOptionalUrl(config, "S3_UPLOAD_BASE_URL", errors);
  requireOptionalUrl(config, "OSS_PUBLIC_BASE_URL", errors);
  requireOptionalUrl(config, "OSS_UPLOAD_BASE_URL", errors);
  requireObjectStorageConfig(config, errors);

  if (config.APP_ENV === "production" && config.MOCK_SEED_ENABLED === "true") {
    errors.push(
      "MOCK_SEED_ENABLED=true is not allowed when APP_ENV=production"
    );
  }

  if (config.APP_ENV === "production" && config.STORAGE_DRIVER === "local") {
    errors.push("STORAGE_DRIVER=local is not allowed when APP_ENV=production");
  }

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
