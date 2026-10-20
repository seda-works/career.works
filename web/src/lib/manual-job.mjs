// @ts-check
// "Add job link" helpers — local addition (cvjobsearch). A user-supplied posting
// (e.g. seen on LinkedIn) goes into data/pipeline.md like a scanned one. When the
// ATS can't be read headlessly (LinkedIn is login-walled), the user pastes the JD
// and it is saved under jds/manual/, keyed by the posting URL, so quick scores and
// full evaluations read that file instead of trying to fetch the page.
import { createHash } from "node:crypto";

/** @param {string} url */
export function isLinkedInUrl(url) {
  try {
    return /(^|\.)linkedin\.com$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Project-relative path of the pasted JD for a posting URL. @param {string} url */
export function manualJdPath(url) {
  const id = createHash("sha1").update(String(url).trim()).digest("hex").slice(0, 16);
  return `jds/manual/${id}.md`;
}

/** Title-case an ATS slug: "acme-health" → "Acme Health". @param {string} slug */
function titleSlug(slug) {
  return decodeURIComponent(slug)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Best-effort employer name from a posting URL (the user can edit it). Returns ""
 * when the URL carries no reliable employer slug (LinkedIn, branded sites).
 * @param {string} url
 */
export function guessCompanyFromUrl(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return "";
  }
  const host = u.hostname.toLowerCase();
  const seg = u.pathname.split("/").filter(Boolean);
  if (/(^|\.)greenhouse\.io$/.test(host)) return seg[0] && seg[0] !== "embed" ? titleSlug(seg[0]) : "";
  if (host === "jobs.lever.co" || host === "jobs.eu.lever.co" || host === "jobs.ashbyhq.com") return seg[0] ? titleSlug(seg[0]) : "";
  const wd = host.match(/^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/);
  if (wd) return titleSlug(wd[1]);
  return "";
}

/**
 * Role + location from fetch-jd.mjs output: the first non-empty line is the title,
 * and a "Location: …" line carries the location.
 * @param {string} text
 */
export function parseFetchedJd(text) {
  const lines = String(text ?? "").split(/\r?\n/).map((l) => l.trim());
  const title = (lines.find((l) => l.length > 0) || "").replace(/^#+\s*/, "");
  const loc = lines.find((l) => /^location:/i.test(l));
  return { title, location: loc ? loc.replace(/^location:\s*/i, "").trim() : "" };
}
