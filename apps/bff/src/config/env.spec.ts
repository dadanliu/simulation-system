import { validateBffEnv } from "./env";

describe("validateBffEnv", () => {
  const validEnv = {
    BACKEND_BASE_URL: "http://localhost:3002",
    MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff"
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
        MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff"
      })
    ).toThrow('BACKEND_BASE_URL must be a valid URL, received "not-a-url"');
  });

  it("applies local defaults for optional BFF settings", () => {
    expect(validateBffEnv(validEnv)).toMatchObject({
      BACKEND_BASE_URL: "http://localhost:3002",
      BFF_PORT: "3001",
      COOKIE_SECURE: undefined,
      CSRF_ALLOWED_ORIGINS: "http://localhost:3000",
      MONGODB_URI: "mongodb://127.0.0.1:27017/next-bff",
      NODE_ENV: "development",
      REDIS_URL: "redis://127.0.0.1:6379"
    });
  });
});
