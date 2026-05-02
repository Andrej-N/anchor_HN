/* ==========================================================================
   Anchora — Auth helpers (JWT + cookie + password compare)
   --------------------------------------------------------------------------
   Vercel serverless (Node 18+) — uses crypto + native fetch.
   ========================================================================== */
import crypto from "node:crypto";

const COOKIE_NAME = "anchora_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/* ---------- Base64URL helpers ---------- */
function b64urlEncode(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return Buffer.from(str, "base64");
}

/* ---------- JWT (HS256) ---------- */
export function signJWT(payload, ttlSeconds = SESSION_TTL_SECONDS) {
  const secret = requireEnv("JWT_SECRET");
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + ttlSeconds };
  const headB64 = b64urlEncode(JSON.stringify(header));
  const payloadB64 = b64urlEncode(JSON.stringify(claims));
  const data = headB64 + "." + payloadB64;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  return data + "." + b64urlEncode(sig);
}

export function verifyJWT(token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [headB64, payloadB64, sigB64] = parts;
  const data = headB64 + "." + payloadB64;

  let secret;
  try { secret = requireEnv("JWT_SECRET"); } catch { return null; }

  const expected = b64urlEncode(crypto.createHmac("sha256", secret).update(data).digest());
  if (!timingSafeStrEqual(expected, sigB64)) return null;

  try {
    const payload = JSON.parse(b64urlDecode(payloadB64).toString("utf-8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function timingSafeStrEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

/* ---------- Password comparison (constant-time) ---------- */
export function comparePassword(provided, expected) {
  if (!expected) return false;
  // Pad both to same length to avoid early exit; check length separately.
  const max = Math.max(provided.length, expected.length, 64);
  const a = Buffer.from(String(provided).padEnd(max, "\0").slice(0, max));
  const b = Buffer.from(String(expected).padEnd(max, "\0").slice(0, max));
  return crypto.timingSafeEqual(a, b) && provided.length === expected.length;
}

/* ---------- Cookie helpers ---------- */
export function setSessionCookie(res, token) {
  const cookie = [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ].join("; ");
  res.setHeader("Set-Cookie", cookie);
}

export function clearSessionCookie(res) {
  const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
  res.setHeader("Set-Cookie", cookie);
}

export function readSessionCookie(req) {
  const header = req.headers.cookie || "";
  const m = header.match(new RegExp("(?:^|;\\s*)" + COOKIE_NAME + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

/* ---------- Middleware ---------- */
export function requireAuth(req, res) {
  const token = readSessionCookie(req);
  const payload = verifyJWT(token);
  if (!payload || !payload.admin) {
    res.status(401).json({ error: "Not authenticated" });
    return null;
  }
  return payload;
}

/* ---------- Origin check (CSRF) ---------- */
export function checkOrigin(req, res) {
  const method = (req.method || "").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const origin = req.headers.origin || req.headers.referer || "";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  if (!host) return true; // can't check, allow
  if (!origin) {
    res.status(400).json({ error: "Missing Origin header" });
    return false;
  }
  try {
    const url = new URL(origin);
    if (url.host === host) return true;
  } catch {}
  res.status(403).json({ error: "Cross-origin request blocked" });
  return false;
}

/* ---------- Env helpers ---------- */
export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export function optionalEnv(name, fallback = "") {
  return process.env[name] || fallback;
}
