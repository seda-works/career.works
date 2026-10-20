// @ts-check
// Quick-score (modes/triage.md) results for inbox postings — local addition (cvjobsearch).
//
// triage writes no files by design, so whoever runs it appends one row per posting to
// data/triage.tsv:  url \t date \t verdict \t score \t reason \t model
// The file is append-only; the LAST row for a url wins, so a re-score replaces the badge.

export const VERDICTS = /** @type {const} */ (["PASS", "MARGINAL", "FAIL", "SKIP"]);

/**
 * @typedef {{ verdict: "PASS"|"MARGINAL"|"FAIL"|"SKIP", score: number|null, reason: string, date: string, model: string }} QuickScore
 */

/**
 * Parse data/triage.tsv text → Map<url, QuickScore>. Tolerant: header and malformed
 * rows (non-http url, unknown verdict) are skipped, never thrown.
 * @param {string | null | undefined} tsv
 * @returns {Map<string, QuickScore>}
 */
export function parseTriageTsv(tsv) {
  /** @type {Map<string, QuickScore>} */
  const out = new Map();
  if (!tsv) return out;
  for (const raw of tsv.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line || line.startsWith("url\t")) continue;
    const [url = "", date = "", verdict = "", score = "", reason = "", model = ""] = line.split("\t");
    const v = verdict.trim().toUpperCase();
    if (!/^https?:\/\//i.test(url) || !VERDICTS.includes(/** @type {any} */ (v))) continue;
    const n = parseFloat(score);
    out.set(url, {
      verdict: /** @type {QuickScore["verdict"]} */ (v),
      score: Number.isFinite(n) ? n : null,
      reason: reason.trim(),
      date: date.trim(),
      model: model.trim(),
    });
  }
  return out;
}

export const TRIAGE_HEADER = "url\tdate\tverdict\tscore\treason\tmodel";

/**
 * Pull the machine-readable TRIAGE line (modes/triage.md step 5) out of an agent's
 * final text. The LAST matching line wins — the mode says it closes the reply.
 * @param {string} text
 * @returns {{ verdict: QuickScore["verdict"], score: number|null, reason: string } | null}
 */
export function parseTriageLine(text) {
  const re = /TRIAGE:\s*(PASS|MARGINAL|FAIL|SKIP)\s*\|[^|\n]*\|[^|\n]*\|\s*([\d.]+)\s*\/\s*5\s*\|\s*([^\n]*)/gi;
  /** @type {RegExpExecArray | null} */
  let m;
  /** @type {RegExpExecArray | null} */
  let last = null;
  while ((m = re.exec(String(text ?? "")))) last = m;
  if (!last) return null;
  const verdict = /** @type {QuickScore["verdict"]} */ (last[1].toUpperCase());
  const n = parseFloat(last[2]);
  return { verdict, score: verdict === "SKIP" || !Number.isFinite(n) ? null : Math.round(n * 10) / 10, reason: last[3].trim() };
}

/**
 * One data/triage.tsv row. Tabs/newlines in any field would break the column
 * grammar, so they are flattened to spaces.
 * @param {{ url: string, date: string, verdict: string, score: number|null, reason: string, model: string }} r
 */
export function formatTriageRow(r) {
  const clean = (/** @type {unknown} */ v) => String(v ?? "").replace(/[\t\r\n]+/g, " ").trim();
  const score = r.score == null ? "" : r.score.toFixed(1);
  return [clean(r.url), clean(r.date), clean(r.verdict), score, clean(r.reason), clean(r.model)].join("\t");
}

/** Badge tone for a verdict. @param {QuickScore["verdict"]} verdict */
export function quickTone(verdict) {
  return verdict === "PASS" ? "good" : verdict === "MARGINAL" ? "warn" : verdict === "FAIL" ? "bad" : "muted";
}

/**
 * Inbox order: quick-scored postings first, highest score first (SKIP counts as
 * unscored), then freshness (newest first_seen first; unknown age last).
 * @param {{ quick?: QuickScore | null, age: number | null }} a
 * @param {{ quick?: QuickScore | null, age: number | null }} b
 */
export function compareInboxRows(a, b) {
  const qa = a.quick && a.quick.verdict !== "SKIP" && a.quick.score != null ? a.quick.score : -1;
  const qb = b.quick && b.quick.verdict !== "SKIP" && b.quick.score != null ? b.quick.score : -1;
  if (qa !== qb) return qb - qa;
  return (a.age ?? Infinity) - (b.age ?? Infinity);
}
