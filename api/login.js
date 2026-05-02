/* ==========================================================================
   POST /api/login
   --------------------------------------------------------------------------
   Body: { password }
   Verifies against ADMIN_PASSWORD env var, sets HttpOnly session cookie.
   ========================================================================== */
import {
  comparePassword, signJWT, setSessionCookie,
  requireEnv, checkOrigin
} from "./_utils/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkOrigin(req, res)) return;

  // Body parsing — Vercel parses JSON automatically when Content-Type is JSON
  const body = typeof req.body === "string" ? safeJson(req.body) : (req.body || {});
  const password = String(body.password || "");

  let expected;
  try {
    expected = requireEnv("ADMIN_PASSWORD");
    requireEnv("JWT_SECRET");
  } catch (e) {
    return res.status(500).json({ error: "Server is missing env vars. See admin/README.md." });
  }

  // Constant-time compare; small artificial delay if wrong
  if (!comparePassword(password, expected)) {
    await new Promise(r => setTimeout(r, 700));
    return res.status(401).json({ error: "Wrong password" });
  }

  const token = signJWT({ admin: true });
  setSessionCookie(res, token);
  return res.status(200).json({ ok: true });
}

function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }
