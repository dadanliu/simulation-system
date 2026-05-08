"use client";

type FrontendErrorReportInput = {
  category: "boundary" | "http" | "network" | "parse" | "runtime" | "timeout";
  message: string;
  source: string;
  stack?: string;
  status?: number;
  traceId?: string;
  url?: string;
};

export async function reportFrontendError(input: FrontendErrorReportInput) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/client-errors", {
      body: JSON.stringify({
        ...input,
        url: input.url ?? window.location.href
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: true,
      method: "POST"
    });
  } catch {
    // Reporting should never break the current UI flow.
  }
}
