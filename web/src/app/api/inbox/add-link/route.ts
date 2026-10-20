// "Add job link" step 2 — local addition (cvjobsearch). Appends one user-supplied
// posting to data/pipeline.md through the core's canonical writer (the same
// addOffersToPipeline Explore uses, which also records it in scan-history so
// scans don't re-add it). A pasted JD is saved to jds/manual/<hash>.md so the
// quick score (/api/triage) and full evaluation read it instead of fetching a
// login-walled page. Zero tokens.
import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/json-body";
import { careerOpsRoot, readInbox } from "@/lib/career-ops";
import { addOffersToPipeline } from "@/lib/core/pipeline";
import { isLinkedInUrl, manualJdPath } from "@/lib/manual-job.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_JD_CHARS = 60_000;

export async function POST(req: Request) {
  const body = await readJsonObject<{ url?: unknown; company?: unknown; role?: unknown; location?: unknown; jdText?: unknown }>(req);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });
  const str = (v: unknown, max = 300) => (typeof v === "string" ? v.replace(/[\t\r\n|]+/g, " ").trim().slice(0, max) : "");
  const url = typeof body.url === "string" ? body.url.trim() : "";
  const company = str(body.company, 120);
  const role = str(body.role, 200);
  const location = str(body.location, 200);
  const jdText = typeof body.jdText === "string" ? body.jdText.trim().slice(0, MAX_JD_CHARS) : "";

  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "Paste a full job-posting URL (https://…)" }, { status: 400 });
  if (!company || !role) return NextResponse.json({ error: "Company and role are required" }, { status: 400 });
  if (isLinkedInUrl(url) && jdText.length < 200) {
    return NextResponse.json({ error: "LinkedIn postings can't be read automatically — paste the job description (or use the company's own apply link)." }, { status: 400 });
  }
  if (readInbox().some((j) => j.url === url)) {
    return NextResponse.json({ error: "That posting is already in your pipeline" }, { status: 409 });
  }

  let savedJd: string | null = null;
  if (jdText.length >= 200) {
    const rel = manualJdPath(url);
    const abs = path.join(careerOpsRoot(), rel);
    try {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, `# ${role}\nCompany: ${company}\nLocation: ${location || "—"}\nSource URL: ${url}\nAdded manually: ${new Date().toISOString()}\n\n${jdText}\n`);
      savedJd = rel;
    } catch (e) {
      return NextResponse.json({ error: `Could not save the job description: ${e instanceof Error ? e.message : e}` }, { status: 500 });
    }
  }

  const result = await addOffersToPipeline([
    { url, company, title: role, location, postedAt: "", ats: isLinkedInUrl(url) ? "linkedin" : "manual", source: "manual" },
  ]);
  if (result.error || result.added < 1) {
    return NextResponse.json({ error: result.error || "The pipeline writer added nothing" }, { status: 500 });
  }
  return NextResponse.json({ added: 1, savedJd });
}
