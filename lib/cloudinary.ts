import { Readable } from "node:stream";

import { v2 as cloudinary } from "cloudinary";

import { env } from "@/lib/env";

/** Root folder for all room chat images in Cloudinary. */
export const CLOUDINARY_FOLDER = "ai-chat-rooms";

let configured = false;

export function getCloudinary() {
  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export function cloudinaryErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : error &&
          typeof error === "object" &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : null;

  if (!message) {
    return "Cloudinary upload failed.";
  }

  if (
    message.includes("Invalid cloud_name") ||
    message.includes("Invalid API Key") ||
    message.includes("Unknown API key")
  ) {
    return "Cloudinary credentials are invalid. Set CLOUDINARY_CLOUD_NAME to the cloud name from your Cloudinary dashboard (Dashboard → Product environment credentials), not the upload folder name.";
  }

  return message;
}

export async function uploadImageBuffer(
  data: Buffer,
  folder: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = getCloudinary().uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(cloudinaryErrorMessage(error)));
          return;
        }

        if (!result?.secure_url) {
          reject(new Error("Cloudinary did not return an image URL."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    Readable.from(data).pipe(uploadStream);
  });
}
