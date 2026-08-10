import mongoose from "mongoose";
import { env } from "./env.js";

/**
 * Connects to MongoDB and registers listeners for post-connection events.
 *
 * Rejects if the initial connection fails so the caller can abort startup —
 * booting an API that cannot reach its database only produces confusing 500s.
 *
 * @returns Resolves once the connection is established.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });

  console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

/** Closes the MongoDB connection during graceful shutdown. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
}
