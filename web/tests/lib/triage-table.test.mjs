import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTriageTsv, quickTone, compareInboxRows, parseTriageLine, formatTriageRow } from "../../src/lib/triage-table.mjs";

test("parseTriageLine takes the last TRIAGE line from agent prose", () => {
  const text = "Reading brief…\nTRIAGE: FAIL | X | Y | 2.0/5 | draft\nOn reflection:\nTRIAGE: PASS | Acme | Sr PM | 4.25/5 | Direct archetype hit, London hybrid\n";
  assert.deepEqual(parseTriageLine(text), { verdict: "PASS", score: 4.3, reason: "Direct archetype hit, London hybrid" });
  assert.deepEqual(parseTriageLine("TRIAGE: SKIP | Umbrella | PM | 0/5 | Posting expired"), { verdict: "SKIP", score: null, reason: "Posting expired" });
  assert.equal(parseTriageLine("no verdict here"), null);
});

test("formatTriageRow flattens tabs/newlines and round-trips through parseTriageTsv", () => {
  const row = formatTriageRow({ url: U1, date: "2026-09-26", verdict: "MARGINAL", score: 3.2, reason: "a\tb\nc", model: "sonnet" });
  assert.equal(row.split("\t").length, 6);
  assert.deepEqual(parseTriageTsv(row).get(U1), { verdict: "MARGINAL", score: 3.2, reason: "a b c", date: "2026-09-26", model: "sonnet" });
});

const U1 = "https://example.com/jobs/1";
const U2 = "https://example.com/jobs/2";

test("parses rows, skips header and malformed lines", () => {
  const tsv = [
    "url\tdate\tverdict\tscore\treason\tmodel",
    `${U1}\t2026-09-26\tPASS\t4.1\tDirect archetype hit\tsonnet`,
    `not-a-url\t2026-09-26\tPASS\t4.0\tx\tsonnet`,
    `${U2}\t2026-09-26\tMAYBE\t3.0\tunknown verdict\tsonnet`,
    "",
  ].join("\n");
  const m = parseTriageTsv(tsv);
  assert.equal(m.size, 1);
  assert.deepEqual(m.get(U1), { verdict: "PASS", score: 4.1, reason: "Direct archetype hit", date: "2026-09-26", model: "sonnet" });
});

test("last row for a url wins (append-only re-score)", () => {
  const tsv = `${U1}\t2026-09-25\tFAIL\t2.5\told\thaiku\n${U1}\t2026-09-26\tMARGINAL\t3.3\tnew\tsonnet\n`;
  assert.equal(parseTriageTsv(tsv).get(U1)?.verdict, "MARGINAL");
});

test("SKIP with a 0 or blank score parses; missing file is empty", () => {
  assert.equal(parseTriageTsv(`${U1}\t2026-09-26\tskip\t\tInaccessible\tsonnet`).get(U1)?.score, null);
  assert.equal(parseTriageTsv(null).size, 0);
});

test("verdict tones", () => {
  assert.equal(quickTone("PASS"), "good");
  assert.equal(quickTone("MARGINAL"), "warn");
  assert.equal(quickTone("FAIL"), "bad");
  assert.equal(quickTone("SKIP"), "muted");
});

test("quick-scored rows sort first by score, then freshness; SKIP counts as unscored", () => {
  const q = (verdict, score) => ({ verdict, score, reason: "", date: "", model: "" });
  const rows = [
    { id: "fresh-unscored", age: 0 },
    { id: "fail", quick: q("FAIL", 2.1), age: 9 },
    { id: "pass", quick: q("PASS", 4.2), age: 20 },
    { id: "skip", quick: q("SKIP", 0), age: 1 },
    { id: "marginal", quick: q("MARGINAL", 3.2), age: 3 },
  ];
  assert.deepEqual([...rows].sort(compareInboxRows).map((r) => r.id), ["pass", "marginal", "fail", "fresh-unscored", "skip"]);
});
