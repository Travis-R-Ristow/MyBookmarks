import { ICON_IMAGE_SIZE } from "../lib/spaces.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const ICON_IMAGE_TYPES = "image/png,image/jpeg,image/webp";

async function decode(file) {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error("That file is not a readable image.");
  }
}

export async function fileToIconDataUrl(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("That image is larger than 5 MB.");
  }
  const bitmap = await decode(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = ICON_IMAGE_SIZE;
  canvas.height = ICON_IMAGE_SIZE;
  canvas
    .getContext("2d")
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, ICON_IMAGE_SIZE, ICON_IMAGE_SIZE);
  bitmap.close();
  return canvas.toDataURL("image/png");
}
