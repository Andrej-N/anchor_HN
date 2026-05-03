/* ==========================================================================
   Anchora — GitHub Contents API wrapper
   --------------------------------------------------------------------------
   All commits go through a single PAT held in GITHUB_TOKEN env var.
   The client never sees the token.
   ========================================================================== */
import { requireEnv, optionalEnv } from "./auth.js";

const GH_API = "https://api.github.com";

function ghHeaders() {
  const token = requireEnv("GITHUB_TOKEN");
  return {
    "Authorization": `Bearer ${token}`,
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "anchora-cms/1.0"
  };
}

function repoSpec() {
  const repo = requireEnv("GITHUB_REPO");
  const branch = optionalEnv("GITHUB_BRANCH", "main");
  return { repo, branch };
}

function encodePath(path) {
  // Encode each segment but keep "/" intact
  return path.split("/").map(encodeURIComponent).join("/");
}

/* ---------- GET file (returns null if 404) ---------- */
export async function ghGet(path) {
  const { repo, branch } = repoSpec();
  const url = `${GH_API}/repos/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub GET ${path} failed: ${r.status} ${await r.text()}`);
  return await r.json();
}

/* ---------- PUT file (create or update) ----------
   contentBase64 must be base64-encoded file content.
   sha is required when updating; omit/null to create.
*/
export async function ghPut(path, contentBase64, message, sha = null) {
  const { repo, branch } = repoSpec();
  const url = `${GH_API}/repos/${repo}/contents/${encodePath(path)}`;
  const body = {
    message,
    content: contentBase64,
    branch
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, {
    method: "PUT",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) {
    const err = new Error(`GitHub PUT ${path} failed: ${r.status} ${await r.text()}`);
    err.status = r.status;
    throw err;
  }
  return await r.json();
}

/* ---------- DELETE file ---------- */
export async function ghDelete(path, message, sha) {
  const { repo, branch } = repoSpec();
  const url = `${GH_API}/repos/${repo}/contents/${encodePath(path)}`;
  const r = await fetch(url, {
    method: "DELETE",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch })
  });
  if (!r.ok) {
    throw new Error(`GitHub DELETE ${path} failed: ${r.status} ${await r.text()}`);
  }
  return await r.json();
}

/* ---------- LIST a directory ---------- */
export async function ghList(dirPath) {
  const { repo, branch } = repoSpec();
  const url = `${GH_API}/repos/${repo}/contents/${encodePath(dirPath)}?ref=${encodeURIComponent(branch)}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`GitHub LIST ${dirPath} failed: ${r.status}`);
  return await r.json(); // array of {name, path, sha, type, ...}
}

/* ---------- Helpers ---------- */
export function jsonToBase64(obj) {
  const json = JSON.stringify(obj, null, 2);
  return Buffer.from(json, "utf-8").toString("base64");
}

export function base64ToJson(b64) {
  const buf = Buffer.from(b64, "base64");
  return JSON.parse(buf.toString("utf-8"));
}
