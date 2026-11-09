/**
 * Generate VILAYA Brand Icons (16, 32, 48, 128)
 * Creates valid PNG files with Forest Green backdrop (#143D2B) and Gold glyph/ring (#C5A059)
 * Pure Node.js with built-in zlib.
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createPng(size) {
  const width = size;
  const height = size;

  // Raw RGBA scanlines: (width * 4 + 1) * height
  const rawData = Buffer.alloc((width * 4 + 1) * height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = size * 0.44;
  const innerRadius = size * 0.36;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        if (dist >= innerRadius && dist <= radius) {
          // Gold border (#C5A059)
          rawData[offset++] = 0xC5;
          rawData[offset++] = 0xA0;
          rawData[offset++] = 0x59;
          rawData[offset++] = 0xFF;
        } else {
          // Forest green backdrop (#143D2B)
          // Add a subtle hour/minute hand clock emblem in center
          const isCenter = Math.abs(dx) <= Math.max(1, size * 0.04) && dy <= 0 && dy >= -size * 0.22;
          const isMinuteHand = Math.abs(dy) <= Math.max(1, size * 0.04) && dx >= 0 && dx <= size * 0.18;

          if (isCenter || isMinuteHand) {
            // Gold clock hands
            rawData[offset++] = 0xE2;
            rawData[offset++] = 0xC8;
            rawData[offset++] = 0x82;
            rawData[offset++] = 0xFF;
          } else {
            rawData[offset++] = 0x14;
            rawData[offset++] = 0x3D;
            rawData[offset++] = 0x2B;
            rawData[offset++] = 0xFF;
          }
        }
      } else {
        // Transparent outside circular badge
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
      }
    }
  }

  const deflated = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(len + 12);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4);
    data.copy(buf, 8);

    // CRC32
    let crc = 0xFFFFFFFF;
    for (let i = 4; i < len + 8; i++) {
      const byte = buf[i];
      for (let j = 0; j < 8; j++) {
        if ((crc ^ (byte >> j)) & 1) {
          crc = (crc >>> 1) ^ 0xEDB88320;
        } else {
          crc = crc >>> 1;
        }
      }
    }
    buf.writeUInt32BE((crc ^ 0xFFFFFFFF) >>> 0, len + 8);
    return buf;
  }

  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve('public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const pngBuf = createPng(size);
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), pngBuf);
  console.log(`Generated icon-${size}.png`);
}
