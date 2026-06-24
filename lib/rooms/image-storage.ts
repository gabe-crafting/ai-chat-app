import { CLOUDINARY_FOLDER, uploadImageBuffer } from "@/lib/cloudinary";
import { createClient } from "@/lib/supabase/server";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isAllowedImageType(contentType: string) {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

async function uploadToCloudinary(
  data: Buffer,
  folder: string,
): Promise<string> {
  return uploadImageBuffer(data, folder);
}

export async function assertRoomParticipant(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("You are not signed in.");
  }

  const { data: participant, error } = await supabase
    .from("room_participants")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!participant) {
    throw new Error("You are not a member of this room.");
  }

  return user;
}

export async function uploadRoomImage(
  roomId: string,
  file: File,
): Promise<string> {
  if (!isAllowedImageType(file.type)) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are supported.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Images must be 10 MB or smaller.");
  }

  const user = await assertRoomParticipant(roomId);
  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadToCloudinary(
    buffer,
    `${CLOUDINARY_FOLDER}/${roomId}/${user.id}`,
  );
}

export async function uploadGeneratedRoomImage(
  roomId: string,
  data: Uint8Array,
  mediaType: string,
): Promise<string> {
  if (!isAllowedImageType(mediaType)) {
    throw new Error("Generated image has an unsupported type.");
  }

  const buffer = Buffer.from(data);

  return uploadToCloudinary(
    buffer,
    `${CLOUDINARY_FOLDER}/${roomId}/generated`,
  );
}
