/* ==========================================================================
   POST /api/logout — clears session cookie.
   ========================================================================== */
import { clearSessionCookie, checkOrigin } from "./_utils/auth.js";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!checkOrigin(req, res)) return;
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
}
