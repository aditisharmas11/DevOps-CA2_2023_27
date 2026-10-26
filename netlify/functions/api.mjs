import serverless from "serverless-http";
import { createApp } from "../../server/app.ts";

let expressHandler;

export const handler = async (event, context) => {
  if (!expressHandler) {
    const { app } = await createApp();
    expressHandler = serverless(app);
  }

  // Normalize path so Express routes match correctly in Netlify Functions
  let normalizedPath = event.path || "/";
  if (normalizedPath.startsWith("/.netlify/functions/api")) {
    normalizedPath = normalizedPath.slice("/.netlify/functions/api".length) || "/";
  }

  // If path is not /health or /metrics and does not start with /api/, add /api prefix
  if (normalizedPath !== "/health" && normalizedPath !== "/metrics" && !normalizedPath.startsWith("/api/")) {
    normalizedPath = "/api" + (normalizedPath.startsWith("/") ? normalizedPath : "/" + normalizedPath);
  }

  const modifiedEvent = {
    ...event,
    path: normalizedPath,
  };

  if (event.rawUrl) {
    try {
      const parsed = new URL(event.rawUrl);
      parsed.pathname = normalizedPath;
      modifiedEvent.rawUrl = parsed.toString();
    } catch {
      // ignore
    }
  }

  return expressHandler(modifiedEvent, context);
};
