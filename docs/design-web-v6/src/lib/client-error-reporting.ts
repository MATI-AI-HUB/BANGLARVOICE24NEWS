// Banglar Voice - lightweight client-side error reporting.
// Captures front-end
// errors (error boundary / window.onerror / unhandled rejections) into the
// browser console and an optional hook. The hook object can be wired to any
// self-hosted error tracker (Sentry, PostHog, ...) by assigning
// `window.__bvErrorHandler` from an integration script - no platform SDK
// dependency is required.
type BvErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type BvErrorHandler = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: BvErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    __bvErrorHandler?: BvErrorHandler;
  }
}

export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[Banglar Voice] client error:", error, context);
  window.__bvErrorHandler?.captureException?.(
    error,
    {
      source: "react_error_boundary",
      route: window.location.pathname,
      ...context,
    },
    {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    },
  );
}
