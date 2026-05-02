/* ==========================================================================
   GET  /api/content  — returns { content, sha }
   PUT  /api/content  — body: { content, sha }, commits to GitHub
   --------------------------------------------------------------------------
   Auth required. Source of truth: data/content.json on the configured repo.
   ========================================================================== */
import { requireAuth, checkOrigin } from "./_utils/auth.js";
import { ghGet, ghPut, jsonToBase64, base64ToJson } from "./_utils/github.js";

const FILE_PATH = "data/content.json";

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  try {
    if (req.method === "GET") {
      const file = await ghGet(FILE_PATH);
      if (!file) {
        return res.status(404).json({ error: `${FILE_PATH} not found in repo` });
      }
      const content = base64ToJson(file.content);
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ content, sha: file.sha });
    }

    if (req.method === "PUT") {
      if (!checkOrigin(req, res)) return;
      const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
      const { content, sha } = body;
      if (!content || typeof content !== "object") {
        return res.status(400).json({ error: "Body must be { content, sha }" });
      }

      // Stamp last updated
      if (content._meta && typeof content._meta === "object") {
        content._meta.lastUpdated = new Date().toISOString().slice(0, 10);
      }

      const b64 = jsonToBase64(content);
      const result = await ghPut(
        FILE_PATH,
        b64,
        "Update site content (admin)",
        sha || undefined
      );
      return res.status(200).json({
        ok: true,
        sha: result.content && result.content.sha,
        commit: result.commit && {
          sha: result.commit.sha,
          url: result.commit.html_url
        }
      });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    console.error("[/api/content]", e);
    return res.status(500).json({ error: e.message || String(e) });
  }
}
