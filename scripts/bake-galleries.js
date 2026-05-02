/* ==========================================================================
   bake-galleries.js
   --------------------------------------------------------------------------
   Reads data/content.json and replaces the inner content of every
   `[data-gallery="..."]` element on apartment-*.html, gallery.html, and
   index.html with rendered image markup. This way:

     • Search engines see every photo (better SEO)
     • Pages work without JavaScript (no-JS fallback)
     • First paint is faster (no fetch round-trip needed for images)

   The runtime content-sync.js still re-renders galleries from content.json
   on load, so admin edits propagate normally — but the baked HTML is the
   stable, SEO-good baseline.

   Run:  node scripts/bake-galleries.js
   ========================================================================== */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CONTENT_FILE = path.join(ROOT, "data", "content.json");

const BENTO_PATTERN = [
  "lg", "md", "sm", "sm", "wide", "sm",
  "tall", "md", "sm", "lg", "md", "sm",
  "wide", "sm", "tall", "md", "sm", "sm",
  "lg", "sm", "md", "sm", "wide", "sm"
];
const bento = i => BENTO_PATTERN[i % BENTO_PATTERN.length];

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- Inner-HTML replacement that finds matching </tag> ---------- */
function replaceDataGalleryInner(html, attrValue, newInner) {
  const attrEsc = attrValue.replace(/[\\^$.*+?()\[\]{}|]/g, "\\$&");
  // Matches the opening element tag with that data-gallery attribute
  const startRe = new RegExp(`<(\\w+)\\s[^>]*data-gallery="${attrEsc}"[^>]*>`);
  const m = html.match(startRe);
  if (!m) return { html, replaced: false };

  const tagName = m[1];
  const startIdx = m.index + m[0].length;
  const closeTag = `</${tagName}>`;
  const openTag = `<${tagName}`;

  // Walk forward keeping nesting depth
  let depth = 1;
  let i = startIdx;
  while (i < html.length && depth > 0) {
    const nextOpen = html.indexOf(openTag, i);
    const nextClose = html.indexOf(closeTag, i);
    if (nextClose === -1) return { html, replaced: false };

    if (nextOpen !== -1 && nextOpen < nextClose) {
      // make sure the open isn't a self-closing meta etc — assume normal div tags here
      depth++;
      i = nextOpen + openTag.length;
    } else {
      depth--;
      if (depth === 0) {
        const before = html.slice(0, startIdx);
        const after = html.slice(nextClose);
        return { html: before + "\n" + newInner + "\n      " + after, replaced: true };
      }
      i = nextClose + closeTag.length;
    }
  }
  return { html, replaced: false };
}

/* ---------- Renderers ---------- */
function renderApartmentGallery(images, altBase) {
  return images.map((src, i) => {
    return `        <div class="apt-gallery__item apt-gallery__item--${bento(i)}" data-lightbox-trigger="true" data-lightbox-src="${esc(src)}" data-lightbox-index="${i}">
          <img src="${esc(src)}" alt="${esc(altBase)} — photo ${i + 1}" loading="${i < 4 ? "eager" : "lazy"}">
        </div>`;
  }).join("\n");
}

function renderMasonry(images, altBase) {
  return images.map((src, i) => {
    return `        <div class="masonry__item" data-lightbox-trigger="true" data-lightbox-src="${esc(src)}">
          <img src="${esc(src)}" alt="${esc(altBase)} — photo ${i + 1}" loading="${i < 6 ? "eager" : "lazy"}">
        </div>`;
  }).join("\n");
}

/* ---------- Bake apartment galleries (1..6) ---------- */
async function bakeApartments(content) {
  for (let i = 0; i < 6; i++) {
    const file = path.join(ROOT, `apartment-${i + 1}.html`);
    const apt = content.apartments[i];
    if (!apt || !Array.isArray(apt.gallery)) {
      console.warn(`! No gallery for apartments[${i}]`);
      continue;
    }
    let html = await fs.readFile(file, "utf-8");
    const inner = renderApartmentGallery(apt.gallery, `${apt.subtitle || "Suite " + (i + 1)} interior`);
    const r = replaceDataGalleryInner(html, `apartments[${i}].gallery`, inner);
    if (!r.replaced) {
      console.warn(`! No data-gallery="apartments[${i}].gallery" in ${file}`);
      continue;
    }
    await fs.writeFile(file, r.html, "utf-8");
    console.log(`✓ apartment-${i + 1}.html — ${apt.gallery.length} photos`);
  }
}

/* ---------- Bake gallery.html (building + parking) ---------- */
async function bakeGalleryPage(content) {
  const file = path.join(ROOT, "gallery.html");
  let html = await fs.readFile(file, "utf-8");

  let okBuilding = false, okParking = false;

  if (Array.isArray(content.building?.images)) {
    const inner = renderMasonry(content.building.images, "Anchora building exterior");
    const r = replaceDataGalleryInner(html, "building.images", inner);
    if (r.replaced) { html = r.html; okBuilding = true; }
  }
  if (Array.isArray(content.parking?.images)) {
    const inner = renderMasonry(content.parking.images, "Private parking for Anchora guests");
    const r = replaceDataGalleryInner(html, "parking.images", inner);
    if (r.replaced) { html = r.html; okParking = true; }
  }

  await fs.writeFile(file, html, "utf-8");
  console.log(`✓ gallery.html — ${okBuilding ? content.building.images.length : "0"} building, ${okParking ? content.parking.images.length : "0"} parking`);
}

/* ---------- Run ---------- */
async function run() {
  console.log("\nAnchora · gallery bake\n");
  const content = JSON.parse(await fs.readFile(CONTENT_FILE, "utf-8"));
  await bakeApartments(content);
  await bakeGalleryPage(content);
  console.log("\nDone. Pages now contain all images directly in HTML.\n");
}

run().catch(e => { console.error(e); process.exit(1); });
