// "Add job link" step 1 — local addition (cvjobsearch). Zero tokens: asks the
// core's fetch-jd.mjs for the JD from the ATS's public API and pre-fills role,
// location and a best-guess employer. LinkedIn (login-walled) and unsupported
// boards come back jdFound:false so the UI asks the user to paste the JD.
import { execFile } from "node:child_process";
import { NextResponse } from "next/server";
import { readJsonObject } from "@/lib/json-body";
import { careerOpsRoot, readInbox, rootScript } from "@/lib/career-ops";
import { guessCompanyFromUrl, isLinkedInUrl, parseFetchedJd } from "@/lib/manual-job.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await readJsonObject<{ url?: unknown }>(req);
  if (!body) return NextResponse.json({ error: "bad json" }, { status: 400 });
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!/^https?:\/\//i.test(url)) return NextResponse.json({ error: "Paste a full job-posting URL (https://…)" }, { status: 400 });

  const existing = readInbox().find((j) => j.url === url);
  if (existing) {
    return NextResponse.json({ alreadyInInbox: true, done: existing.done, company: existing.company, role: existing.role, location: existing.location || "" });
  }

  const linkedin = isLinkedInUrl(url);
  let jd = "";
  if (!linkedin) {
    const root = careerOpsRoot();
    jd = await new Promise<string>((resolve) => {
      execFile(process.execPath, [rootScript("fetch-jd"), url], { cwd: root, timeout: 45_000, maxBuffer: 4 * 1024 * 1024 }, (err, stdout) => {
        const text = err ? "" : String(stdout || "").trim();
        resolve(text.length > 300 ? text : "");
      });
    });
  }
  const { title, location } = jd ? parseFetchedJd(jd) : { title: "", location: "" };
  return NextResponse.json({
    linkedin,
    jdFound: !!jd,
    company: guessCompanyFromUrl(url),
    role: title,
    location,
  });
}
