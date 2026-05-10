const DEFAULT_QUERY = "page=1&pageSize=20&sortBy=createdAt&sortOrder=desc";

const baseUrl = process.env.BFF_PUBLIC_BASE_URL ?? "http://127.0.0.1:3001";
const sessionCookie = process.env.NEXT_BFF_SESSION ?? "";
const rawQueries = process.env.COMMODITY_CACHE_WARMUP_QUERIES ?? DEFAULT_QUERY;
const queries = rawQueries
  .split("|")
  .map((query) => query.trim())
  .filter(Boolean);

function buildWarmupUrl(query) {
  const url = new URL("/api/commodity/list", baseUrl);
  const queryParams = new URLSearchParams(query);

  for (const [key, value] of queryParams.entries()) {
    url.searchParams.set(key, value);
  }

  return url;
}

async function warmupCommodityList(query, index) {
  const url = buildWarmupUrl(query);
  const traceId = `commodity-cache-warmup-${Date.now()}-${index + 1}`;
  const headers = {
    "x-trace-id": traceId
  };

  if (sessionCookie) {
    headers.cookie = sessionCookie;
  }

  const response = await fetch(url, {
    headers
  });
  const result = {
    cacheKey: response.headers.get("x-commodity-list-cache-key") ?? "",
    cacheRefresh: response.headers.get("x-commodity-list-cache-refresh") ?? "",
    cacheSource: response.headers.get("x-commodity-list-cache-source") ?? "",
    cacheState: response.headers.get("x-commodity-list-cache-state") ?? "",
    status: response.status,
    traceId: response.headers.get("x-trace-id") ?? traceId,
    url: url.toString()
  };

  console.log(JSON.stringify(result));

  if (!response.ok) {
    throw new Error(`warmup failed with status ${response.status}`);
  }
}

async function main() {
  if (!sessionCookie) {
    console.warn(
      "NEXT_BFF_SESSION is empty. Warmup requires an authenticated session cookie."
    );
  }

  for (const [index, query] of queries.entries()) {
    await warmupCommodityList(query, index);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
