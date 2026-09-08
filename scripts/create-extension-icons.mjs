import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.join(root, 'public', 'icons');

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function makePng(size) {
  const pixels = Buffer.alloc((size + 1) * size * 4);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size + 1) * 4;
    pixels[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const offset = row + 4 + x * 4;
      const inMark = Math.abs(x - size / 2) < size * 0.3 && Math.abs(y - size / 2) < size * 0.3;
      pixels[offset] = inMark ? 240 : 17;
      pixels[offset + 1] = inMark ? 122 : 24;
      pixels[offset + 2] = inMark ? 92 : 39;
      pixels[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('\x89PNG\r\n\x1a\n', 'binary'),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

await mkdir(outputDir, { recursive: true });
for (const size of [16, 48, 128]) {
  await writeFile(path.join(outputDir, `icon${size}.png`), makePng(size));
}