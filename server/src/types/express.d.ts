/**
 * Adds the authenticated user id to Express requests.
 *
 * Set by requireAuth, so it is present on every route behind that middleware.
 */
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
