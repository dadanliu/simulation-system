import { validateBffEnv } from "./env";

describe("validateBffEnv", () => {
  const validEnv = {
    BACKEND_BASE_URL: "http://localhost:3002",
    MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff-dev"
  };

  it("fails fast when MONGODB_URI is missing", () => {
    expect(() =>
      validateBffEnv({
        BACKEND_BASE_URL: "http://localhost:3002"
      })
    ).toThrow("MONGODB_URI is required");
  });

  it("fails fast when BACKEND_BASE_URL is invalid", () => {
    expect(() =>
      validateBffEnv({
        BACKEND_BASE_URL: "not-a-url",
        MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff-dev"
      })
    ).toThrow('BACKEND_BASE_URL must be a valid URL, received "not-a-url"');
  });

  it("applies local defaults for optional BFF settings", () => {
    expect(validateBffEnv(validEnv)).toMatchObject({
      BACKEND_BASE_URL: "http://localhost:3002",
      BFF_PORT: "3001",
      COOKIE_SECURE: undefined,
      CSRF_ALLOWED_ORIGINS: "http://localhost:3000",
      APP_ENV: "development",
      MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff-dev",
      NODE_ENV: "development",
      REDIS_URL: "redis://127.0.0.1:6379"
    });
  });

  it("accepts an isolated test database for APP_ENV=test", () => {
    expect(
      validateBffEnv({
        ...validEnv,
        APP_ENV: "test",
        MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff-test"
      })
    ).toMatchObject({
      APP_ENV: "test",
      MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff-test"
    });
  });

  it("rejects APP_ENV=test when the database is not test scoped", () => {
    expect(() =>
      validateBffEnv({
        ...validEnv,
        APP_ENV: "test"
      })
    ).toThrow(
      'APP_ENV=test requires MONGODB_URI database name to end with "-test"'
    );
  });

  it("rejects production when the database name looks non-production", () => {
    expect(() =>
      validateBffEnv({
        ...validEnv,
        APP_ENV: "production"
      })
    ).toThrow("APP_ENV=production must not use a dev/test/mock database name");
  });

  it("rejects production mock seed", () => {
    expect(() =>
      validateBffEnv({
        ...validEnv,
        APP_ENV: "production",
        MOCK_SEED_ENABLED: "true",
        MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff"
      })
    ).toThrow("MOCK_SEED_ENABLED=true is not allowed when APP_ENV=production");
  });
});
