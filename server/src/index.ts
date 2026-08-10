import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./config/db.js";

/**
 * Boots the server: connect to MongoDB first, then accept traffic.
 *
 * Startup aborts if the database is unreachable, and SIGINT/SIGTERM drain
 * in-flight requests before closing the database connection.
 */
async function start(): Promise<void> {
  await connectDatabase();

  const server = createApp().listen(env.PORT, () => {
    console.log(`Server listening on http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((error: unknown) => {
  console.error("Failed to start server:", error instanceof Error ? error.message : error);
  process.exit(1);
});
