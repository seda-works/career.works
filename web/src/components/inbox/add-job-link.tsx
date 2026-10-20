"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";

// "Add job link" — local addition (cvjobsearch). Paste a posting URL (e.g. one seen
// on LinkedIn) → free lookup via fetch-jd.mjs pre-fills role/location/employer →
// add it to the inbox (data/pipeline.md) → optionally quick-score it right away.
// LinkedIn and unsupported boards can't be read headlessly, so the JD is pasted.
type Lookup = { linkedin: boolean; jdFound: boolean; company: string; role: string; location: string; alreadyInInbox?: boolean; done?: boolean };

export function AddJobLink() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<"idle" | "looking" | "form" | "adding">("idle");
  const [info, setInfo] = useState<Lookup | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [jdText, setJdText] = useState("");
  const [quickAfter, setQuickAfter] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const reset = () => {
    setUrl("");
    setPhase("idle");
    setInfo(null);
    setCompany("");
    setRole("");
    setLocation("");
    setJdText("");
    setError("");
  };

  const lookup = async () => {
    const u = url.trim();
    setError("");
    setStatus("");
    if (!/^https?:\/\//i.test(u)) {
      setError("Paste a full job-posting URL (https://…).");
      return;
    }
    setPhase("looking");
    try {
      const res = await fetch("/api/inbox/lookup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: u }) });
      const data = (await res.json()) as Lookup & { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      if (data.alreadyInInbox) {
        setError(data.done ? `Already in your pipeline (processed or skipped): ${data.company} · ${data.role}` : `Already in your inbox: ${data.company} · ${data.role}`);
        setPhase("idle");
        return;
      }
      setInfo(data);
      setCompany(data.company);
      setRole(data.role);
      setLocation(data.location);
      setPhase("form");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
      setPhase("idle");
    }
  };

  const needsJd = !!info && !info.jdFound;
  const canAdd = company.trim() && role.trim() && (!info?.linkedin || jdText.trim().length >= 200);

  const add = async () => {
    const u = url.trim();
    setError("");
    setPhase("adding");
    try {
      const res = await fetch("/api/inbox/add-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u, company, role, location, jdText: jdText.trim() || undefined }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const label = `${company} · ${role}`;
      reset();
      router.refresh();
      if (quickAfter) {
        setStatus(`Added ${label}. Quick scoring… (~40 s)`);
        const q = await fetch("/api/triage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: u }) });
        const qd = (await q.json().catch(() => ({}))) as { error?: string; record?: { verdict: string; score: number | null } };
        setStatus(q.ok && qd.record ? `Added ${label} — quick score ${qd.record.verdict}${qd.record.score != null ? ` ${qd.record.score.toFixed(1)}` : ""}.` : `Added ${label}, but the quick score failed: ${qd.error || q.status}`);
        router.refresh();
      } else {
        setStatus(`Added ${label} to your inbox.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the posting");
      setPhase("form");
    }
  };

  if (!open) {
    return (
      <div className="mx-auto mt-4 flex max-w-3xl items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-brand/50 hover:text-brand max-sm:min-h-[44px]"
        >
          <Plus className="size-3.5" /> Add job link
        </button>
        {status && <span className="text-xs text-faint">{status}</span>}
      </div>
    );
  }

  const field = "w-full rounded-md border border-border bg-surface/60 px-3 py-2 text-sm outline-none placeholder:text-faint focus:border-brand/50";

  return (
    <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-border bg-surface/40 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Add a job link to your inbox</p>
        <button type="button" onClick={() => { reset(); setOpen(false); }} className="text-faint hover:text-foreground" aria-label="Close">
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={url}
            onChange={(e) => { setUrl(e.target.value); if (phase === "form") { setPhase("idle"); setInfo(null); } }}
            onKeyDown={(e) => { if (e.key === "Enter" && phase === "idle") void lookup(); }}
            placeholder="https://… (LinkedIn, company careers page, Greenhouse, Workday…)"
            className={cn(field, "pl-9")}
          />
        </div>
        {phase !== "form" && (
          <button
            type="button"
            onClick={() => void lookup()}
            disabled={phase === "looking"}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-60"
          >
            {phase === "looking" && <Loader2 className="size-4 animate-spin" />} Look up
          </button>
        )}
      </div>

      {(phase === "form" || phase === "adding") && info && (
        <div className="mt-3 space-y-2">
          {info.jdFound ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">Found the posting on its job board — details pre-filled. Check them and add.</p>
          ) : info.linkedin ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              LinkedIn can&apos;t be read automatically. Tip: if the post has <em>Apply on company website</em>, paste that link instead. Otherwise fill in the fields and paste the job description below.
            </p>
          ) : (
            <p className="text-xs text-amber-600 dark:text-amber-400">This site can&apos;t be read for free. Fill in the fields; pasting the job description makes scoring reliable.</p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company *" className={field} />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role / title *" className={field} />
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className={field} />
          </div>
          {needsJd && (
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              rows={6}
              placeholder={info.linkedin ? "Paste the job description from LinkedIn (required)…" : "Paste the job description (recommended)…"}
              className={field}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void add()}
              disabled={!canAdd || phase === "adding"}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
            >
              {phase === "adding" && <Loader2 className="size-4 animate-spin" />} Add to inbox
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <input type="checkbox" checked={quickAfter} onChange={(e) => setQuickAfter(e.target.checked)} className="accent-brand" />
              Quick score after adding (~40 s, few tokens)
            </label>
            {info.linkedin && jdText.trim().length > 0 && jdText.trim().length < 200 && (
              <span className="text-xs text-faint">Paste the full description ({jdText.trim().length}/200+ characters)</span>
            )}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      {status && <p className="mt-2 text-xs text-faint">{status}</p>}
    </div>
  );
}
