/* ==========================================================================
   compress-images.js
   --------------------------------------------------------------------------
   Walks /images/ recursively and recompresses every .jpg/.jpeg to a
   web-friendly size + quality, OVERWRITING the original file in place.

   Defaults:
     • Max long edge:    1920 px (no upscale; smaller stays smaller)
     • Quality:          82 (mozjpeg)
     • Progressive:      yes
     • Chroma subsample: 4:2:0
     • Strip metadata:   yes (smaller, no GPS leaks)

   Run:
     node scripts/compress-images.js
   ========================================================================== */
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve("images");
const MAX_EDGE = 1920;
const QUALITY = 82;

const JPG_RE = /\.jpe?g$/i;

let totalIn = 0;
let totalOut = 0;
let files = 0;
let skipped = 0;
let failed = 0;

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + " KB";
  return bytes + " B";
}

function pad(s, n, char = " ") {
  s = String(s);
  return s.length >= n ? s : s + char.repeat(n - s.length);
}

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      yield* walk(full);
    } else if (e.isFile() && JPG_RE.test(e.name)) {
      yield full;
    }
  }
}

async function compressOne(file) {
  const stat = await fs.stat(file);
  const inSize = stat.size;
  totalIn += inSize;
  files++;

  // Read into buffer first (Sharp can't safely read & write the same file path)
  const buf = await fs.readFile(file);

  let out;
  try {
    out = await sharp(buf, { failOn: "none" })
      .rotate()                                  // honor EXIF orientation, then strip
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: "inside",
        withoutEnlargement: true
      })
      .jpeg({
        quality: QUALITY,
        mozjpeg: true,
        progressive: true,
        chromaSubsampling: "4:2:0"
      })
      .toBuffer();
  } catch (e) {
    failed++;
    console.warn(`  ! FAILED   ${path.relative(ROOT, file)} — ${e.message}`);
    return;
  }

  // Only overwrite if we actually saved bytes
  if (out.length >= inSize) {
    skipped++;
    totalOut += inSize;
    console.log(`  · skip      ${pad(path.relative(ROOT, file), 56)}  (already ${fmt(inSize)})`);
    return;
  }

  await fs.writeFile(file, out);
  totalOut += out.length;
  const pct = Math.round((1 - out.length / inSize) * 100);
  console.log(`  ✓ ${pad(fmt(inSize), 8)} → ${pad(fmt(out.length), 8)}  −${pad(pct + "%", 4)}  ${path.relative(ROOT, file)}`);
}

async function run() {
  console.log(`\nAnchora · image compression`);
  console.log(`  Source root:  ${ROOT}`);
  console.log(`  Target:       ≤ ${MAX_EDGE}px long edge, JPEG Q${QUALITY} (mozjpeg, progressive)\n`);

  try { await fs.access(ROOT); }
  catch { console.error(`No /images directory at ${ROOT}`); process.exit(1); }

  const t0 = Date.now();
  for await (const f of walk(ROOT)) {
    await compressOne(f);
  }
  const ms = Date.now() - t0;

  console.log(`\nDone in ${(ms / 1000).toFixed(1)}s`);
  console.log(`  Files processed:  ${files}`);
  console.log(`  Skipped (smaller already): ${skipped}`);
  if (failed) console.log(`  Failed:           ${failed}`);
  console.log(`  Size before:      ${fmt(totalIn)}`);
  console.log(`  Size after:       ${fmt(totalOut)}`);
  if (totalIn > 0) {
    const pct = Math.round((1 - totalOut / totalIn) * 100);
    console.log(`  Saved:            −${pct}%  (${fmt(totalIn - totalOut)})\n`);
  }
}

run().catch(err => { console.error(err); process.exit(1); });
