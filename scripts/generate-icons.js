import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const CANVAS = 128;
const SUPERSAMPLE = 4;
const SIZES = [16, 32, 48, 128];
const DEFAULT_DESIGN = "stacked";
const STORE_FLAG = "--store";
const STORE_SIZE = 128;
const STORE_PADDING = 16;
const STORE_FILE = "store-icon-128.png";
const STORE_DIR = "MyBookmarks-store-assets";
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];

function hex(value) {
  return [1, 3, 5].map((offset) => parseInt(value.slice(offset, offset + 2), 16));
}

function mix(from, to, amount) {
  return from.map((channel, index) => channel + (to[index] - channel) * amount);
}

function gradient(stops) {
  const colors = stops.map(hex);
  return (x, y) => {
    const position = Math.min(Math.max((x + y) / (2 * CANVAS), 0), 1) * (colors.length - 1);
    const index = Math.min(Math.floor(position), colors.length - 2);
    return mix(colors[index], colors[index + 1], position - index);
  };
}

function solid(color) {
  return () => color;
}

function roundedRect({ left, top, right, bottom, radius }) {
  return (x, y) => {
    if (x < left || x > right || y < top || y > bottom) {
      return false;
    }
    const nearestX = Math.min(Math.max(x, left + radius), right - radius);
    const nearestY = Math.min(Math.max(y, top + radius), bottom - radius);
    return (x - nearestX) ** 2 + (y - nearestY) ** 2 <= radius ** 2;
  };
}

function ribbon({ centerX, top, width, height, radius, notch }) {
  const halfWidth = width / 2;
  const body = roundedRect({ left: centerX - halfWidth, top, right: centerX + halfWidth, bottom: top + height + radius, radius });
  return (x, y) => {
    const edge = top + height - notch * (1 - Math.abs(x - centerX) / halfWidth);
    return y <= edge && body(x, y);
  };
}

function sparkle({ centerX, centerY, size }) {
  return (x, y) => Math.sqrt(Math.abs(x - centerX)) + Math.sqrt(Math.abs(y - centerY)) <= Math.sqrt(size);
}

function shifted(shape, dx, dy) {
  return (x, y) => shape(x - dx, y - dy);
}

function layer(shape, color, opacity = 1) {
  return { shape, color, opacity };
}

const TILE = roundedRect({ left: 4, top: 4, right: 124, bottom: 124, radius: 30 });

function stackedDesign() {
  const back = ribbon({ centerX: 76, top: 26, width: 44, height: 70, radius: 9, notch: 17 });
  const front = ribbon({ centerX: 54, top: 36, width: 46, height: 72, radius: 9, notch: 18 });
  return [
    layer(TILE, gradient(["#4f46e5", "#7c3aed", "#ec4899"])),
    layer(back, solid(WHITE), 0.42),
    layer(shifted(front, 3, 4), solid(BLACK), 0.2),
    layer(front, solid(WHITE)),
  ];
}

function sparkDesign() {
  const mark = ribbon({ centerX: 58, top: 30, width: 50, height: 76, radius: 10, notch: 19 });
  return [
    layer(TILE, gradient(["#2563eb", "#4f46e5", "#7c3aed"])),
    layer(shifted(mark, 3, 4), solid(BLACK), 0.2),
    layer(mark, solid(WHITE)),
    layer(sparkle({ centerX: 96, centerY: 34, size: 20 }), solid(hex("#fde047"))),
    layer(sparkle({ centerX: 104, centerY: 60, size: 9 }), solid(hex("#fde047"))),
  ];
}

function spacesDesign() {
  const shape = (centerX, top) => ribbon({ centerX, top, width: 26, height: 62, radius: 6, notch: 11 });
  return [
    layer(TILE, gradient(["#1e1b4b", "#111827"])),
    layer(shape(34, 30), solid(hex("#818cf8"))),
    layer(shape(64, 38), solid(hex("#f472b6"))),
    layer(shape(94, 30), solid(hex("#fbbf24"))),
  ];
}

const DESIGNS = { stacked: stackedDesign, spark: sparkDesign, spaces: spacesDesign };

function sample(layers, x, y) {
  return layers.reduce(
    (pixel, { shape, color, opacity }) => {
      if (!shape(x, y)) {
        return pixel;
      }
      const alpha = opacity + pixel.alpha * (1 - opacity);
      const blended = mix(pixel.color, color(x, y), opacity / alpha);
      return { color: blended, alpha };
    },
    { color: BLACK, alpha: 0 },
  );
}

function renderPixels(layers, size) {
  const pixels = Buffer.alloc(size * size * 4);
  const scale = CANVAS / size;
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const sum = [0, 0, 0];
      let alphaSum = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const pixel = sample(layers, (px + (sx + 0.5) / SUPERSAMPLE) * scale, (py + (sy + 0.5) / SUPERSAMPLE) * scale);
          pixel.color.forEach((channel, index) => {
            sum[index] += channel * pixel.alpha;
          });
          alphaSum += pixel.alpha;
        }
      }
      const offset = (py * size + px) * 4;
      sum.forEach((channel, index) => {
        pixels[offset + index] = alphaSum ? Math.round(channel / alphaSum) : 0;
      });
      pixels[offset + 3] = Math.round((alphaSum / samples) * 255);
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

function padded(layers, padding) {
  const scale = CANVAS / (CANVAS - padding * 2);
  const inner = (value) => (value - padding) * scale;
  return layers.map(({ shape, color, opacity }) => ({
    shape: (x, y) => shape(inner(x), inner(y)),
    color: (x, y) => color(inner(x), inner(y)),
    opacity,
  }));
}

function writePng(file, layers, size) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodePng(size, renderPixels(layers, size)));
  process.stdout.write(`wrote ${file}\n`);
}

const projectRoot = path.join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const forStore = args.includes(STORE_FLAG);
const [designName = DEFAULT_DESIGN, outputDir = path.join(projectRoot, "icons")] = args.filter((arg) => arg !== STORE_FLAG);
const design = DESIGNS[designName];
if (!design) {
  throw new Error(`Unknown design "${designName}". Choose one of: ${Object.keys(DESIGNS).join(", ")}`);
}
if (forStore) {
  writePng(path.join(projectRoot, "..", STORE_DIR, STORE_FILE), padded(design(), STORE_PADDING), STORE_SIZE);
} else {
  SIZES.forEach((size) => writePng(path.join(outputDir, `icon${size}.png`), design(), size));
}
