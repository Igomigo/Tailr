import type { UploadApiResponse } from "cloudinary";
import { getCloudinary } from "../config/cloudinary.js";
import { upstreamError } from "../shared/errors.js";

export interface StoredFile {
  /** Publicly reachable URL for downloading the file. */
  url: string;
  /** Cloudinary public_id, used to locate or delete the file later. */
  storageId: string;
  sizeBytes: number;
}

/** Cloudinary folders, kept separate so uploads and outputs are easy to tell apart. */
const FOLDERS = {
  generated: "resume-builder/generated",
  uploads: "resume-builder/uploads",
} as const;

/**
 * Uploads a buffer to Cloudinary as a raw file.
 *
 * Resumes are PDFs and DOCX files rather than images, so they are stored with
 * `resource_type: "raw"`. Cloudinary's SDK exposes buffer uploads only through
 * a stream, which is why this wraps `upload_stream` in a promise.
 *
 * @param buffer - File bytes.
 * @param folder - Destination folder.
 * @param fileName - Name used as the public id, and hence the download filename.
 */
async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  fileName: string,
): Promise<StoredFile> {
  const cloudinary = getCloudinary();

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder,
        public_id: fileName,
        // Cloudinary appends a suffix rather than overwriting on name clashes.
        unique_filename: true,
        use_filename: true,
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(upstreamError(`Cloudinary upload failed: ${error?.message ?? "no response"}`));
          return;
        }
        resolve(uploaded);
      },
    );
    stream.end(buffer);
  });

  return {
    url: result.secure_url,
    storageId: result.public_id,
    sizeBytes: result.bytes,
  };
}

/**
 * Stores a generated resume PDF.
 *
 * @param buffer - PDF bytes.
 * @param fileName - Download filename, e.g. "jane-doe-resume.pdf".
 */
export async function storePdf(buffer: Buffer, fileName: string): Promise<StoredFile> {
  return uploadBuffer(buffer, FOLDERS.generated, fileName);
}

/**
 * Stores a file the user uploaded, such as an existing resume.
 *
 * @param buffer - File bytes.
 * @param fileName - Original filename from the upload.
 */
export async function storeUpload(buffer: Buffer, fileName: string): Promise<StoredFile> {
  return uploadBuffer(buffer, FOLDERS.uploads, fileName);
}
