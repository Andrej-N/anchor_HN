/* ==========================================================================
   GET /api/me — returns 200 if session valid, 401 otherwise.
   Used by admin shell to decide whether to show login or editor on load.
   ========================================================================== */
import { readSessionCookie, verifyJWT } from "./_utils/auth.js";

export default function handler(req, res) {
  const token = readSessionCookie(req);
  const payload = verifyJWT(token);
  res.setHeader("Cache-Control", "no-store");
  if (!payload || !payload.admin) {
    return res.status(401).json({ authenticated: false });
  }
  return res.status(200).json({ authenticated: true, exp: payload.exp });
}
