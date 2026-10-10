import { createApp } from "./app";
import { setupVite, serveStatic } from "./vite";
import { log } from "./logger";

(async () => {
  const { app, server } = await createApp();

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT) || 5000;

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();