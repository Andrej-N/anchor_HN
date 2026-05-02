# Anchora Apartments — Website

A static website for Anchora Apartments — six rustic-luxe apartments in a 400-year-old stone house in old-town Herceg Novi, Montenegro.

Plain HTML, CSS and JavaScript. No build step, no server, no database. Owner edits the site from a single password-protected admin page (no GitHub knowledge required). Hosted on Vercel.

---

## For the apartment owner

Open `https://YOUR-SITE.vercel.app/admin/`, sign in with the password the developer gave you, edit any text or photo, click **Save**. The public site rebuilds itself automatically — ~30 seconds later your change is live.

That's the entire workflow.

> **More detail:** [`admin/README.md`](admin/README.md) walks through every kind of edit (text, photos, galleries, reordering).

---

## For the developer (one-time setup, ~10 min)

1. Push to GitHub (e.g. via GitHub Desktop).
2. Connect the repo to a Vercel project.
3. Generate a GitHub Personal Access Token with `repo` scope.
4. In Vercel → Settings → Environment Variables, add:
   - `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`
   - `ADMIN_PASSWORD` (this is what you give the owner)
   - `JWT_SECRET` (random 32+ chars)
5. Redeploy.
6. Hand the owner two things: the admin URL + the password.

Full step-by-step: [`admin/README.md`](admin/README.md).

---

## What's where

```
├── index.html                    Landing page
├── apartment-1.html … 6.html     Per-apartment pages
├── gallery.html                  Building + parking gallery
├── admin.html                    Legacy offline editor (backup)
│
├── admin/
│   ├── index.html                Login + form-based editor
│   └── README.md                 Setup + usage guide
│
├── api/
│   ├── _utils/                   Shared: JWT, cookies, GitHub wrapper
│   ├── login.js                  POST /api/login
│   ├── logout.js                 POST /api/logout
│   ├── me.js                     GET  /api/me
│   ├── content.js                GET/PUT /api/content
│   └── upload.js                 POST /api/upload (images)
│
├── data/
│   └── content.json              Single source of truth (text + image lists)
│
├── css/                          Modular stylesheets (variables, base, layout, etc.)
├── js/                           Modular scripts (content-sync, lightbox, …)
├── images/                       Photos, organized per apartment + exterior + parking
│
├── vercel.json                   Routing + cache headers
├── package.json                  Node version pin
├── robots.txt, sitemap.xml       SEO basics
├── site.webmanifest              PWA manifest
└── humans.txt
```

---

## How the site stays in sync with the editor

1. The owner edits in the admin (`/admin/`).
2. The browser sends changes to a Vercel serverless function (`/api/content`), which uses a server-side GitHub token to commit `data/content.json` (and any new photos) to the GitHub repo. The owner never sees the token or GitHub.
3. Vercel detects the commit and re-deploys (~30 s).
4. On the next page load, every page fetches `/data/content.json` and updates its DOM. The HTML files have the content baked in for SEO + no-JS readability, so search engines and slow connections still see the right content.

This keeps SEO solid (real HTML on first paint), keeps editing simple (one password, one form), and avoids any build pipeline.

---

## Local development

The project is plain static files. Any of these works:

```bash
# Option 1 — open index.html directly (note: data/content.json fetch will be blocked by file://; baked HTML still renders)
# Option 2 — run a tiny static server (recommended):
npx serve .
# then open the URL it prints (usually http://localhost:3000)
```

For full Vercel parity (running the `/api/*` OAuth functions locally):

```bash
npm i -g vercel
vercel dev
```

---

## Deployment

Connect the GitHub repo to a new Vercel project. Vercel auto-detects this as a static site — no build command needed. Set five env vars:

- `GITHUB_TOKEN`     — Personal Access Token with `repo` scope
- `GITHUB_REPO`      — `username/repo`
- `GITHUB_BRANCH`    — `main`
- `ADMIN_PASSWORD`   — owner's sign-in password (give this to the owner)
- `JWT_SECRET`       — random 32+ char string

Full step-by-step in [`admin/README.md`](admin/README.md).

---

## Custom domain & SEO

Once you attach a custom domain in Vercel:

1. Edit `data/content.json` → `site.url` to your real domain.
2. Edit `sitemap.xml` and `robots.txt` to use your real domain.
3. Submit `sitemap.xml` to Google Search Console.

The site already includes:

- Schema.org `LodgingBusiness`, `Apartment`, `ImageGallery`, `BreadcrumbList` JSON-LD
- Open Graph + Twitter Card meta tags on every page
- Canonical URLs and `hreflang` ready
- Mobile-first responsive layout
- `prefers-reduced-motion` honored throughout

---

## Contact

Anchora Apartments
Marka Vojnovića 33, 85340 Herceg Novi, Montenegro
[anchorapartmentshn@gmail.com](mailto:anchorapartmentshn@gmail.com)
[@anchorapartmentshn](https://www.instagram.com/anchorapartmentshn/)
