import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const CANVAS = 128;
const SUPERSAMPLE = 4;
const SIZES = [16, 32, 48, 128];
const OUTPUT_DIR = path.join(import.meta.dirname, "..", "icons");

const BACKGROUND_TOP = [99, 102, 241];
const BACKGROUND_BOTTOM = [37, 99, 235];
const MARK = [255, 255, 255];
const BACKGROUND_MIN = 6;
const BACKGROUND_MAX = 122;
const BACKGROUND_RADIUS = 28;
const BOOKMARK = [
  [42, 30],
  [86, 30],
  [86, 100],
  [64, 82],
  [42, 100],
];

function insideRoundedSquare(x, y) {
  if (x < BACKGROUND_MIN || x > BACKGROUND_MAX || y < BACKGROUND_MIN || y > BACKGROUND_MAX) {
    return false;
  }
  const innerMin = BACKGROUND_MIN + BACKGROUND_RADIUS;
  const innerMax = BACKGROUND_MAX - BACKGROUND_RADIUS;
  const nearestX = Math.min(Math.max(x, innerMin), innerMax);
  const nearestY = Math.min(Math.max(y, innerMin), innerMax);
  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy <= BACKGROUND_RADIUS * BACKGROUND_RADIUS;
}

function insidePolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function sample(x, y) {
  if (!insideRoundedSquare(x, y)) {
    return [0, 0, 0, 0];
  }
  if (insidePolygon(x, y, BOOKMARK)) {
    return [...MARK, 255];
  }
  const t = (y - BACKGROUND_MIN) / (BACKGROUND_MAX - BACKGROUND_MIN);
  const color = BACKGROUND_TOP.map((channel, index) => channel + (BACKGROUND_BOTTOM[index] - channel) * t);
  return [...color, 255];
}

function renderPixels(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = CANVAS / size;
  const samplesPerPixel = SUPERSAMPLE * SUPERSAMPLE;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0, 0];
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) * scale;
          const y = (py + (sy + 0.5) / SUPERSAMPLE) * scale;
          const [r, g, b, a] = sample(x, y);
          sum[0] += r * a;
          sum[1] += g * a;
          sum[2] += b * a;
          sum[3] += a;
        }
      }
      const offset = (py * size + px) * 4;
      const alpha = sum[3] / samplesPerPixel;
      pixels[offset] = sum[3] ? Math.round(sum[0] / sum[3]) : 0;
      pixels[offset + 1] = sum[3] ? Math.round(sum[1] / sum[3]) : 0;
      pixels[offset + 2] = sum[3] ? Math.round(sum[2] / sum[3]) : 0;
      pixels[offset + 3] = Math.round(alpha);
    }
  }
  return pixels;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([length, body, checksum]);
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  const rowLength = size * 4 + 1;
  const raw = Buffer.alloc(rowLength * size);
  for (let row = 0; row < size; row++) {
    pixels.copy(raw, row * rowLength + 1, row * size * 4, (row + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
SIZES.forEach((size) => {
  const file = path.join(OUTPUT_DIR, `icon${size}.png`);
  fs.writeFileSync(file, encodePng(size, renderPixels(size)));
  process.stdout.write(`wrote ${file}\n`);
});
