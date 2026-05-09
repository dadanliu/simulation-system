"use client";

import { useReportWebVitals } from "next/web-vitals";
import { reportFrontendMetric } from "@/src/lib/client-metrics-report";

export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    void reportFrontendMetric({
      delta: metric.delta,
      id: metric.id,
      name: metric.name,
      navigationType: metric.navigationType,
      rating: metric.rating,
      value: metric.value
    });
  });

  return null;
}
