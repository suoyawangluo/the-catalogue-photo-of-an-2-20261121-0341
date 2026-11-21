// the-catalogue-photo-of-an-2-20261121-0341: entry driver. The harness runs `node /bot/main.ts`
// (Node 22). It copies entry.png from the bot directory to /output/entry.png.
import { copyFileSync, readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

copyFileSync(join(BOT_DIR, 'entry.png'), join(OUTPUT_DIR, 'entry.png'));

// Check the output landed before the run ends: the file exists, is non-empty,
// and its sha256 matches the source entry.png exactly.
const outPath = join(OUTPUT_DIR, 'entry.png');
const outStat = statSync(outPath);
if (!outStat.isFile() || outStat.size === 0) {
  throw new Error('entry.png was not written');
}
const outSha = createHash('sha256').update(readFileSync(outPath)).digest('hex');
const srcSha = createHash('sha256').update(readFileSync(join(BOT_DIR, 'entry.png'))).digest('hex');
if (outSha !== srcSha) {
  throw new Error(`entry.png mismatch: output ${outSha} != source ${srcSha}`);
}
console.log(`copied entry.png -> ${outPath} (${outStat.size} bytes, sha256 ${outSha})`);
