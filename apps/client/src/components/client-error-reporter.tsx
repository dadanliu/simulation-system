"use client";

import { useEffect } from "react";
import { parseAppError } from "@/src/lib/app-error";
import { reportFrontendError } from "@/src/lib/client-error-report";

export function ClientErrorReporter() {
  useEffect(() => {
    function handleError(event: ErrorEvent) {
      const appError =
        event.error instanceof Error ? parseAppError(event.error) : null;

      void reportFrontendError({
        category: "runtime",
        message: event.message || "Unhandled browser error",
        source: "window.onerror",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        status: appError?.status,
        traceId: appError?.traceId
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
      const appError = parseAppError(reason);

      void reportFrontendError({
        category: "runtime",
        message: reason.message || "Unhandled promise rejection",
        source: "window.unhandledrejection",
        stack: reason.stack,
        status: appError?.status,
        traceId: appError?.traceId
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}
