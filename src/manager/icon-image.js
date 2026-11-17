import { ICON_IMAGE_SIZE } from "../lib/spaces.js";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_DATA_URL_LENGTH = 40000;
const DANGEROUS_ELEMENTS = "script,foreignObject,iframe,object,embed";

export const ICON_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/svg+xml";

function ensureNamespace(text) {
  if (text.includes("xmlns=")) {
    return text;
  }
  return text.replace(/<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
}

function sanitizeSvg(text) {
  const doc = new DOMParser().parseFromString(ensureNamespace(text), "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    return null;
  }
  const svg = doc.documentElement;
  if (svg.localName !== "svg") {
    return null;
  }
  if (svg.getAttribute("viewBox")) {
    svg.removeAttribute("width");
    svg.removeAttribute("height");
  }
  svg.querySelectorAll(DANGEROUS_ELEMENTS).forEach((node) => node.remove());
  for (const node of [svg, ...svg.querySelectorAll("*")]) {
    for (const attr of [...node.attributes]) {
      if (attr.name.toLowerCase().startsWith("on")) {
        node.removeAttribute(attr.name);
      }
    }
  }
  return new XMLSerializer().serializeToString(svg);
}

function svgToDataUrl(serialized) {
  const bytes = new TextEncoder().encode(serialized);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
}

export function parseSvgInput(text) {
  const trimmed = text.trim();
  if (!trimmed.startsWith("<svg") && !trimmed.startsWith("<?xml")) {
    return null;
  }
  const sanitized = sanitizeSvg(trimmed);
  if (!sanitized) {
    throw new Error("That SVG could not be read.");
  }
  const dataUrl = svgToDataUrl(sanitized);
  if (dataUrl.length > MAX_DATA_URL_LENGTH) {
    throw new Error("That SVG is too large for an icon.");
  }
  return dataUrl;
}

export function isIconSvg(value) {
  return typeof value === "string" && value.startsWith("data:image/svg+xml;");
}

export function decodeSvgDataUrl(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

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
  if (file.type === "image/svg+xml") {
    const dataUrl = parseSvgInput(await file.text());
    if (!dataUrl) {
      throw new Error("That SVG file could not be read.");
    }
    return dataUrl;
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
