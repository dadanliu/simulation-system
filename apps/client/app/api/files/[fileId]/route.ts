import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { loadClientConfig } from "@/src/config/env";

const { bffBaseUrl } = loadClientConfig();

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;
  const cookieStore = await cookies();
  const upstreamUrl = new URL(
    `${bffBaseUrl}/api/files/${encodeURIComponent(fileId)}`
  );

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      accept: request.headers.get("accept") ?? "*/*",
      cookie: cookieStore.toString(),
      ...(request.headers.get("if-modified-since")
        ? {
            "if-modified-since": request.headers.get("if-modified-since") ?? ""
          }
        : {}),
      ...(request.headers.get("if-none-match")
        ? { "if-none-match": request.headers.get("if-none-match") ?? "" }
        : {})
    },
    method: "GET"
  });

  const headers = new Headers();

  for (const headerName of [
    "cache-control",
    "cdn-cache-control",
    "content-length",
    "content-type",
    "etag",
    "last-modified",
    "pragma",
    "surrogate-control",
    "vary"
  ]) {
    const value = upstreamResponse.headers.get(headerName);

    if (value) {
      headers.set(headerName, value);
    }
  }

  if (upstreamResponse.status === 304) {
    return new Response(null, {
      headers,
      status: 304
    });
  }

  return new Response(await upstreamResponse.arrayBuffer(), {
    headers,
    status: upstreamResponse.status
  });
}
