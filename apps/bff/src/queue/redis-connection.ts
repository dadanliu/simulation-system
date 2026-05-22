import type { RedisOptions } from "ioredis";

export function createBullRedisConnection(redisUrl: string): RedisOptions {
  const parsedUrl = new URL(redisUrl);
  const database = parsedUrl.pathname.replace(/^\//, "");

  return {
    db: database ? Number(database) : undefined,
    host: parsedUrl.hostname,
    maxRetriesPerRequest: null,
    password: parsedUrl.password
      ? decodeURIComponent(parsedUrl.password)
      : undefined,
    port: parsedUrl.port ? Number(parsedUrl.port) : 6379,
    tls: parsedUrl.protocol === "rediss:" ? {} : undefined,
    username: parsedUrl.username
      ? decodeURIComponent(parsedUrl.username)
      : undefined
  };
}
