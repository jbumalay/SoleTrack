import { config } from "./server/config";
import { initDb } from "./server/db";
import { seedData } from "./server/seed";
import { createApp } from "./server/app";

/** Thin bootstrap: init DB + seed, build the app, listen. All logic lives in server/. */
async function main(): Promise<void> {
  await initDb();
  await seedData();
  const app = await createApp();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

main().catch((err: unknown) => {
  console.error("Failed to start server:", err instanceof Error ? err.message : "unknown");
  process.exit(1);
});
