/* ==========================================================================
   update-contact.js
   --------------------------------------------------------------------------
   One-shot updater that:
     • Adds the phone link to the top-bar on every apartment + gallery page
       (replacing the address pin)
     • Adds a Phone row to the booking CTA contact widget on each apartment
     • Adds Schema.org telephone field on apartment pages

   Idempotent: detects already-updated markup and skips it.

   Run:  node scripts/update-contact.js
   ========================================================================== */
import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const FILES = [
  "apartment-1.html",
  "apartment-2.html",
  "apartment-3.html",
  "apartment-4.html",
  "apartment-5.html",
  "apartment-6.html",
  "gallery.html"
];

const OLD_TOPBAR = `<div class="top-bar__contacts">
      <span class="top-bar__contact">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
        </svg>
        <span data-key="site.address.street">Marka Vojnovića 33</span>,
        <span data-key="site.address.city">Herceg Novi</span>
      </span>
      <a class="top-bar__contact" href="mailto:anchorapartmentshn@gmail.com">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
        </svg>
        <span data-key="site.primaryEmail">anchorapartmentshn@gmail.com</span>
      </a>
    </div>`;

const NEW_TOPBAR = `<div class="top-bar__contacts">
      <a class="top-bar__contact" href="tel:+38269785573">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span data-key="site.primaryPhone">+382 69 785 573</span>
      </a>
      <a class="top-bar__contact" href="mailto:anchorapartmentshn@gmail.com">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>
        </svg>
        <span data-key="site.primaryEmail">anchorapartmentshn@gmail.com</span>
      </a>
    </div>`;

/* The booking CTA on each apartment page has a 3-row contact widget.
   We replace the whole block to inject a Phone row at the top. */
const OLD_CTA_BLOCK = `<div class="apt-cta__contact-row">
          <span class="apt-cta__contact-label">Email</span>
          <span class="apt-cta__contact-value"><a href="mailto:anchorapartmentshn@gmail.com" data-key="site.primaryEmail">anchorapartmentshn@gmail.com</a></span>
        </div>
        <div class="apt-cta__contact-row">
          <span class="apt-cta__contact-label">Address</span>
          <span class="apt-cta__contact-value"><span data-key="site.address.street">Marka Vojnovića 33</span>, <span data-key="site.address.city">Herceg Novi</span></span>
        </div>
        <div class="apt-cta__contact-row">
          <span class="apt-cta__contact-label">Instagram</span>
          <span class="apt-cta__contact-value"><a href="https://www.instagram.com/anchorapartmentshn/" target="_blank" rel="noopener" data-key="site.social.instagramHandle">@anchorapartmentshn</a></span>
        </div>`;

const NEW_CTA_BLOCK = `<div class="apt-cta__contact-row">
          <span class="apt-cta__contact-label">Phone &amp; WhatsApp</span>
          <span class="apt-cta__contact-value"><a href="tel:+38269785573" data-key="site.primaryPhone">+382 69 785 573</a></span>
        </div>
        <div class="apt-cta__contact-row">
          <span class="apt-cta__contact-label">Email</span>
          <span class="apt-cta__contact-value"><a href="mailto:anchorapartmentshn@gmail.com" data-key="site.primaryEmail">anchorapartmentshn@gmail.com</a></span>
        </div>
        <div class="apt-cta__contact-row">
          <span class="apt-cta__contact-label">Instagram</span>
          <span class="apt-cta__contact-value"><a href="https://www.instagram.com/anchorapartmentshn/" target="_blank" rel="noopener" data-key="site.social.instagramHandle">@anchorapartmentshn</a></span>
        </div>`;

async function processFile(file) {
  const full = path.join(ROOT, file);
  let html = await fs.readFile(full, "utf-8");
  let changed = false;

  if (html.includes(OLD_TOPBAR)) {
    html = html.replace(OLD_TOPBAR, NEW_TOPBAR);
    changed = true;
  } else if (html.includes(`href="tel:+38269785573"`)) {
    // already updated
  } else {
    console.warn(`  ! ${file}: top-bar pattern not found (may need manual edit)`);
  }

  if (file.startsWith("apartment-")) {
    if (html.includes(OLD_CTA_BLOCK)) {
      html = html.replace(OLD_CTA_BLOCK, NEW_CTA_BLOCK);
      changed = true;
    } else if (html.includes(`apt-cta__contact-label">Phone`)) {
      // already updated
    } else {
      console.warn(`  ! ${file}: CTA block pattern not found`);
    }

    // Add telephone field to the LodgingBusiness Schema.org block on apartment pages
    // (Apartment schemas don't have telephone but containedInPlace might)
    html = html.replace(
      `"name": "Anchora Apartments",\n      "url": "https://anchora-apartments.me/",\n      "address":`,
      `"name": "Anchora Apartments",\n      "url": "https://anchora-apartments.me/",\n      "telephone": "+38269785573",\n      "address":`
    );
  }

  if (changed) {
    await fs.writeFile(full, html, "utf-8");
    console.log(`  ✓ ${file} updated`);
  } else {
    console.log(`  · ${file} unchanged`);
  }
}

async function run() {
  console.log("\nAnchora · contact info updater\n");
  for (const f of FILES) {
    await processFile(f);
  }
  console.log("\nDone.\n");
}

run().catch(e => { console.error(e); process.exit(1); });
