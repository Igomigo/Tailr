import express, { type Express } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { errorHandler, notFoundHandler } from "./shared/error-middleware.js";
import { chatRouter } from "./chat/chat.routes.js";
import { authRouter } from "./auth/auth.routes.js";
import { env } from "./config/env.js";

/**
 * Builds the Express application: middleware, routes, and error handling.
 *
 * Kept separate from server startup so the app can be imported and exercised
 * without binding a port.
 *
 * @returns A configured Express instance.
 */
export function createApp(): Express {
  const app = express();

  // The client is served from a different origin in every environment, so
  // browser requests need an explicit allow-list. The session travels in an
  // Authorization header rather than a cookie, so no credentials are involved.
  app.use(cors({ origin: env.CLIENT_URL }));

  // Every response here is private to one account. Express derives its ETag
  // from the body alone, so two users asking for the same path get the same
  // validator; a cache keyed on the URL could then answer one user from
  // another's stored response. Disabling ETags removes the validator, and
  // no-store keeps these bodies out of shared caches altogether.
  app.set("etag", false);
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    const dbConnected = mongoose.connection.readyState === 1;
    res.status(dbConnected ? 200 : 503).json({
      success: dbConnected,
      status: dbConnected ? "ok" : "degraded",
      database: dbConnected ? "connected" : "disconnected",
      uptime: Math.floor(process.uptime()),
    });
  });

  app.use("/auth", authRouter);
  app.use("/chat", chatRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
