/* ==========================================================================
   POST /api/upload — body: { path, dataBase64 }
   --------------------------------------------------------------------------
   Uploads/replaces a single image file under the /images/ tree.
   Auth required. Validates path stays inside images/ and is a known type.
   Vercel default body limit ~4.5MB — fine for typical .jpg.
   ========================================================================== */
import { requireAuth, checkOrigin } from "./_utils/auth.js";
import { ghGet, ghPut } from "./_utils/github.js";

const MAX_BYTES = 4 * 1024 * 1024;             // ~4 MB hard cap
const ALLOWED   = /\.(jpe?g|png|webp|gif|avif)$/i;
const PATH_RE   = /^images\/[A-Za-z0-9_\-./ ]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!requireAuth(req, res)) return;
  if (!checkOrigin(req, res)) return;

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
    const path = String(body.path || "").trim();
    const dataBase64 = String(body.dataBase64 || "");

    if (!path || !dataBase64) {
      return res.status(400).json({ error: "Body must be { path, dataBase64 }" });
    }
    if (!PATH_RE.test(path) || path.includes("..")) {
      return res.status(400).json({ error: "Invalid path. Must be inside images/" });
    }
    if (!ALLOWED.test(path)) {
      return res.status(400).json({ error: "Unsupported file type. Use jpg, png, webp, gif, or avif." });
    }
    // Approximate size check: base64 is 4/3 of binary
    if ((dataBase64.length * 3) / 4 > MAX_BYTES) {
      return res.status(413).json({ error: "File too large. Max ~4 MB per upload." });
    }

    // Look up SHA if file already exists (so we update instead of failing)
    const existing = await ghGet(path);
    const sha = existing ? existing.sha : undefined;

    await ghPut(path, dataBase64, `Upload photo: ${path}`, sha);
    return res.status(200).json({ ok: true, path });
  } catch (e) {
    console.error("[/api/upload]", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
