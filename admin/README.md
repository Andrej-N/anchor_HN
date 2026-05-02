# Anchora — Content Editor (Vercel + GitHub, owner-friendly)

The owner of the site signs in with **a single password** and edits everything from one screen. They never see GitHub, Vercel, or any developer tooling.

> **For the apartment owner:** open `https://YOUR-SITE.vercel.app/admin/`, sign in with the password you were given, edit anything, click **Save**. The public site rebuilds itself in about 30 seconds. That's it.

The rest of this document is for whoever sets the site up the first time (the developer).

---

## How it works

```
   ┌──────────────────────┐
   │ /admin/  (in browser)│   The owner logs in with one password
   └──────────┬───────────┘
              │
              ▼
   ┌──────────────────────┐
   │ /api/content (Vercel)│   Reads/writes data/content.json
   │ /api/upload  (Vercel)│   Uploads new photos
   │ /api/login   (Vercel)│   Issues session cookie
   └──────────┬───────────┘
              │ uses GitHub API with a Personal Access Token
              │ (kept server-side in Vercel env vars; owner never sees it)
              ▼
   ┌──────────────────────┐
   │  GitHub repository   │   ← every save = a commit
   └──────────┬───────────┘
              │ Vercel watches GitHub
              ▼
   ┌──────────────────────┐
   │  Live site rebuilds  │   ← ~30 seconds later, new content is live
   └──────────────────────┘
```

The owner just signs in and edits. The plumbing is invisible.

---

## First-time setup (developer, ~10 min)

You'll need: a GitHub account (yours), a Vercel account (yours), and a project folder with this site's files.

### Step 1 — Push the project to GitHub

Easiest path: **GitHub Desktop** (https://desktop.github.com/).

1. **File → Add Local Repository** → choose this project folder.
2. Click **Publish repository**, name it (e.g. `anchora-apartments`). Make it **Private** if you don't want the source code public.

### Step 2 — Connect Vercel

1. Sign up to https://vercel.com/ with your GitHub account.
2. **Add New… → Project → Import** the repo.
3. Defaults are correct (no build command, no output dir — it's a static site).
4. **Deploy.**
5. Note the URL Vercel gives you (e.g. `https://anchora-apartments.vercel.app`).

### Step 3 — Generate a GitHub Personal Access Token (PAT)

This token lets the Vercel functions read & write to the GitHub repo on the owner's behalf.

1. Go to https://github.com/settings/tokens
2. Click **Generate new token → Generate new token (classic)**.
3. Note: `Anchora CMS`. Expiration: **No expiration** (or as long as you're comfortable with).
4. Scopes: tick **`repo`** (full control of private repositories).
5. Generate, then **copy the token** (looks like `ghp_xxx…`). You won't see it again.

### Step 4 — Configure Vercel environment variables

Open your Vercel project → **Settings → Environment Variables** and add four variables (apply to **Production**, **Preview**, and **Development**):

| Name                       | Value                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`             | The PAT you just copied (`ghp_…`)                                                         |
| `GITHUB_REPO`              | Your `username/repo` exactly — e.g. `andrejnedeljkovic/anchora-apartments`                |
| `GITHUB_BRANCH`            | `main`                                                                                    |
| `ADMIN_PASSWORD`           | A strong password the owner will use to sign in (at least 12 characters)                  |
| `JWT_SECRET`               | A random 32+ character string. Generate one at https://www.random.org/strings/ or in your terminal: `openssl rand -base64 32` |

**Save**, then go to **Deployments → ⋯ on latest → Redeploy** so the new env vars take effect.

### Step 5 — Test it

1. Visit `https://YOUR-SITE.vercel.app/admin/`.
2. Enter the `ADMIN_PASSWORD` value from Step 4.
3. You should see the editor with all the site's current content loaded from `data/content.json`.
4. Make a tiny change (e.g. edit the Hero eyebrow) and click **Save**.
5. Check your GitHub repo — there should be a new commit "Update site content (admin)".
6. About 30 seconds later, refresh the public site — your change should be live.

### Step 6 — Hand it over to the owner

Send the owner only two things:

- **URL:** `https://YOUR-SITE.vercel.app/admin/`
- **Password:** the value of `ADMIN_PASSWORD`

That's all they need.

---

## Owner's daily workflow

### To change text

1. Open the URL, sign in with the password (you only re-sign-in every 7 days).
2. Click any section in the left sidebar.
3. Edit any field.
4. Click **Save changes** (or press **Ctrl+S** / **Cmd+S**).
5. Wait ~30 seconds and refresh the public site.

> Fields that say **"HTML allowed"** accept `<em>...</em>` to make a word italic in serif headlines. Use it sparingly.

### To add new photos to an apartment

1. In the sidebar, click the apartment (e.g. **Suite 03**).
2. Scroll to **Photo gallery**.
3. **Drag photos directly onto the dotted box**, or click **Upload photos**.
4. The photos upload one by one — you'll see "Uploading 1 / 5 — name.jpg".
5. Once done, click **Save changes**.

### To replace the hero or thumbnail

In the apartment's **Featured photos** group, click **Upload…** next to **Hero image** (or **Card thumbnail**), pick the file. Save.

### To remove a photo from a gallery

In the gallery list, click the **✕** to the right of the photo. The image file itself stays in the repo (so you don't lose it) — only the gallery entry is removed. Save.

### To reorder photos

Use the **▲ / ▼** buttons on the right of each row.

### To discard everything you've edited since the last save

Click **Discard changes** in the bottom save bar.

---

## Troubleshooting

**"Wrong password" on sign-in**
- Re-check the `ADMIN_PASSWORD` env var in Vercel. After changing env vars, you must **Redeploy**.

**"Server is missing env vars"**
- One of `GITHUB_TOKEN`, `GITHUB_REPO`, `JWT_SECRET`, `ADMIN_PASSWORD` is missing. Add it, then redeploy.

**Save fails with "GitHub PUT failed: 401"**
- The PAT is invalid or expired. Generate a new one in GitHub (Step 3 above), update `GITHUB_TOKEN` in Vercel, redeploy.

**Save fails with "GitHub PUT failed: 422"**
- Usually a stale SHA — someone else (or a parallel browser tab) updated the file. The editor will reload latest content automatically.

**Photo upload fails with "File too large"**
- Vercel functions cap request bodies at ~4.5 MB. Compress the photo before uploading (e.g. https://squoosh.app/).

**Changes don't show up on the live site**
- Vercel deploys take ~30 seconds. Hard-refresh the browser (Ctrl+Shift+R) to bypass cache.
- Check Vercel **Deployments** tab — if the latest deploy is red, click it for the error.

**The editor shows photos as "missing"**
- The image path in the JSON points to a file that doesn't exist in the repo. Either upload the photo with the right name, or remove the entry.

---

## Security notes

- The admin password is checked against `ADMIN_PASSWORD` in constant time (resistant to timing attacks). Brute-force attempts are slowed by an artificial 700 ms delay on failure.
- Sessions are stored as **HttpOnly + Secure + SameSite=Lax** cookies. Cookie expiry is 7 days; logging out clears it.
- The GitHub token never leaves the server — every commit goes through Vercel functions.
- All write endpoints check the **Origin** header to mitigate CSRF.
- Vercel responses include `noindex, nofollow` headers for `/admin/*` so search engines won't index it.
- `JWT_SECRET` should be at least 32 characters of randomness. Rotating it instantly invalidates all sessions (everyone has to sign in again).

---

## What lives where

```
admin/
├── index.html        ← The editor app (login + form-based editor)
└── README.md         ← This file

api/
├── _utils/
│   ├── auth.js       ← JWT, cookie, password compare
│   └── github.js     ← GitHub Contents API wrapper
├── login.js          ← POST /api/login
├── logout.js         ← POST /api/logout
├── me.js             ← GET  /api/me  (session check)
├── content.js        ← GET /api/content + PUT /api/content
└── upload.js         ← POST /api/upload (image upload)

data/
└── content.json      ← The single source of truth

vercel.json           ← Routing & cache headers
```

---

## Backup: legacy offline editor

The project also includes `/admin.html` at the project root — a fully self-contained file-picker editor that works without internet. It's there only as a fallback for demos or local edits. Don't share it with the owner; the cloud `/admin/` is the only one they need.
