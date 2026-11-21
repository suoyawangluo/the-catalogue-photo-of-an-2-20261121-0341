// the-catalogue-photo-of-an-2-20261121-0341: entry driver. The harness runs `node /bot/main.ts`
// (Node 22). It copies entry.png from the bot directory to /output/entry.png, then gates
// the output on the caps RULES.txt sets for this bounty: a whole PNG or JPEG of at most
// 1,048,576 bytes and 1024 by 1024 pixels. Anything over a cap fails the run loudly
// instead of shipping an invalid entry.
import { copyFileSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Caps from RULES.txt ("The gate"): at most 1 MiB, at most 1024 by 1024 pixels.
const MAX_BYTES = 1048576;
const MAX_WIDTH = 1024;
const MAX_HEIGHT = 1024;

const srcPath = join(BOT_DIR, 'entry.png');
const outPath = join(OUTPUT_DIR, 'entry.png');

// Validate the source before copying it: it must exist, be non-empty, and be
// a real PNG — the 8 magic bytes 89 50 4E 47 0D 0A 1A 0A. A truncated or
// non-PNG source fails here, before anything is written to /output.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const srcStat = statSync(srcPath);
if (!srcStat.isFile() || srcStat.size === 0) {
  throw new Error('entry.png source is missing or empty');
}
if (!readFileSync(srcPath).subarray(0, 8).equals(PNG_MAGIC)) {
  throw new Error('entry.png source is not a PNG (bad magic bytes)');
}

copyFileSync(srcPath, outPath);

// Check the output landed before the run ends: the file exists, is non-empty,
// and its sha256 matches the source entry.png exactly.
const outStat = statSync(outPath);
if (!outStat.isFile() || outStat.size === 0) {
  throw new Error('entry.png was not written');
}
const outBytes = readFileSync(outPath);
const outSha = createHash('sha256').update(outBytes).digest('hex');
const srcSha = createHash('sha256').update(readFileSync(srcPath)).digest('hex');
if (outSha !== srcSha) {
  throw new Error(`entry.png mismatch: output ${outSha} != source ${srcSha}`);
}

// Gate: the output must fit the RULES caps, or the entry is invalid and must
// not ship. Size first, then dimensions straight out of the PNG's IHDR chunk:
// 8-byte magic, 4-byte length, 4-byte type 'IHDR', then width and height as
// big-endian uint32 at bytes 16..24.
if (outStat.size > MAX_BYTES) {
  throw new Error(`entry.png too large: ${outStat.size} bytes > ${MAX_BYTES} cap`);
}
if (outBytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
  throw new Error('entry.png is not a PNG (no IHDR chunk)');
}
const width = outBytes.readUInt32BE(16);
const height = outBytes.readUInt32BE(20);
if (width > MAX_WIDTH || height > MAX_HEIGHT) {
  throw new Error(`entry.png too big: ${width}x${height} > ${MAX_WIDTH}x${MAX_HEIGHT} cap`);
}
console.log(`copied entry.png -> ${outPath} (${outStat.size} bytes, ${width}x${height}, sha256 ${outSha})`);
