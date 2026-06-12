/**
 * Zero-dependency PWA icon generator (no ImageMagick required).
 * Draws the Loops mark — an orbit ring with a satellite dot on a teal
 * rounded square — straight into RGBA buffers and encodes PNGs by hand.
 *
 * Run: node scripts/generate-icons.mjs
 * Outputs: public/icons/icon-{192,512}.png, public/icons/apple-touch-icon.png
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BG = [38, 110, 115]; // #266e73 — matches the app's primary color
const FG = [255, 255, 255];

// ── Minimal PNG encoder ──────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // Raw scanlines, filter byte 0 per row
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ── Drawing (signed-distance shapes with soft edges) ─────────────────────────

const clamp01 = (v) => Math.max(0, Math.min(1, v));
/** 1 inside (negative distance), 0 outside, ~1.5px soft edge. */
const coverage = (dist) => clamp01(0.5 - dist / 1.5);

function drawIcon(size) {
  const c = size / 2;
  const cornerR = size * 0.22;
  const halfMinusR = c - cornerR;
  const ringR = size * 0.26;
  const ringW = size * 0.055;
  const dotR = size * 0.085;
  // Satellite dot sits on the ring, upper-right (matches the lucide Orbit vibe)
  const angle = -Math.PI / 4;
  const dotX = c + Math.cos(angle) * ringR;
  const dotY = c + Math.sin(angle) * ringR;

  const buf = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;

      // Rounded-square SDF
      const qx = Math.max(Math.abs(px - c) - halfMinusR, 0);
      const qy = Math.max(Math.abs(py - c) - halfMinusR, 0);
      const bgAlpha = coverage(Math.hypot(qx, qy) - cornerR);

      // Ring + dot SDFs
      const dCenter = Math.hypot(px - c, py - c);
      const ringCov = coverage(Math.abs(dCenter - ringR) - ringW / 2);
      const dotCov = coverage(Math.hypot(px - dotX, py - dotY) - dotR);
      const fgAlpha = Math.max(ringCov, dotCov);

      const i = (y * size + x) * 4;
      buf[i] = Math.round(BG[0] + (FG[0] - BG[0]) * fgAlpha);
      buf[i + 1] = Math.round(BG[1] + (FG[1] - BG[1]) * fgAlpha);
      buf[i + 2] = Math.round(BG[2] + (FG[2] - BG[2]) * fgAlpha);
      buf[i + 3] = Math.round(255 * bgAlpha);
    }
  }
  return buf;
}

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

for (const [size, name] of [
  [192, "icon-192.png"],
  [512, "icon-512.png"],
  [180, "apple-touch-icon.png"],
]) {
  writeFileSync(join(outDir, name), encodePng(size, drawIcon(size)));
  console.log(`wrote public/icons/${name}`);
}
