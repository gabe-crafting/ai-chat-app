import { NextResponse } from "next/server";

import { uploadRoomImage } from "@/lib/rooms/image-storage";

export const maxDuration = 60;

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const roomId = String(formData.get("roomId") ?? "").trim();
  const file = formData.get("file");

  if (!roomId) {
    return NextResponse.json({ error: "roomId is required." }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  try {
    const url = await uploadRoomImage(roomId, file);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("[api/upload-image]", error);

    const message =
      error instanceof Error
        ? error.message
        : error &&
            typeof error === "object" &&
            "message" in error &&
            typeof (error as { message: unknown }).message === "string"
          ? (error as { message: string }).message
          : "Failed to upload image.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
