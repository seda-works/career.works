"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import type { InboxJob } from "@/lib/career-ops";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/cn";

// Postings skipped from the inbox (✕), shown on the SKIP tab. Skip flips the
// pipeline.md row to `- [x]`, which otherwise makes the posting vanish with only
// a 5-second Undo. This lists those rows (minus the ones that went on to the
// tracker) so a skip can be reviewed and restored later — Restore flips the row
// back through the same /api/inbox/skip endpoint the Undo toast uses.
export function SkippedInbox({ items }: { items: InboxJob[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  if (items.length === 0) return null;

  const restore = async (url: string) => {
    setError(null);
    setPending((p) => new Set(p).add(url));
    try {
      const res = await fetch("/api/inbox/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, done: false }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(url);
        return n;
      });
    }
  };

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-border">
      <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 bg-surface/60 px-4 py-2.5 text-xs uppercase tracking-wide text-faint">
        <span className="font-medium">Skipped from inbox</span>
        <span className="tabular-nums">{items.length}</span>
        <span className="normal-case tracking-normal max-sm:basis-full">— hidden with ✕, never scored. Restore puts one back in the inbox.</span>
      </header>
      {error && <p className="px-4 pb-2 text-xs text-red-400">{error}</p>}
      <ul className="divide-y divide-border border-t border-border">
        {items.map((job) => (
          <li key={job.url} className="flex items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-4">
            <CompanyLogo name={job.company} size={20} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-medium text-foreground">{job.company}</span>
                <span className="text-muted"> · </span>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open the job posting"
                  className="text-foreground/80 underline decoration-border underline-offset-2 transition-colors hover:text-brand hover:decoration-brand"
                >
                  {job.role}
                  <ExternalLink className="ml-1 inline size-3 align-[-1px] opacity-60" aria-hidden />
                </a>
              </p>
              {job.location && <p className="mt-0.5 truncate text-[11px] text-faint">{job.location}</p>}
            </div>
            <button
              type="button"
              onClick={() => void restore(job.url)}
              disabled={pending.has(job.url)}
              title="Restore to the inbox"
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-brand max-sm:min-h-[44px]",
                pending.has(job.url) && "opacity-60",
              )}
            >
              {pending.has(job.url) ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              <span>Restore</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
