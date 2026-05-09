"use client";

type FrontendMetricReportInput = {
  delta?: number;
  id: string;
  name: string;
  navigationType?: string;
  rating?: string;
  value: number;
};

const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "local";

function readPage(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

export async function reportFrontendMetric(input: FrontendMetricReportInput) {
  if (typeof window === "undefined") {
    return;
  }

  const url = window.location.href;

  try {
    await fetch("/api/client-metrics", {
      body: JSON.stringify({
        ...input,
        appVersion,
        page: readPage(url),
        url,
        userAgent: window.navigator.userAgent
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json"
      },
      keepalive: true,
      method: "POST"
    });
  } catch {
    // Metrics reporting must not affect the current page.
  }
}
