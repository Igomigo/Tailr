import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

let configured = false;

/**
 * Returns the configured Cloudinary client.
 *
 * Configuration is lazy so the server still boots without credentials; only
 * routes that actually upload fail, which keeps the rest of the API testable.
 *
 * @throws When Cloudinary credentials are missing.
 */
export function getCloudinary(): typeof cloudinary {
  if (configured) return cloudinary;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.",
    );
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  configured = true;
  return cloudinary;
}
