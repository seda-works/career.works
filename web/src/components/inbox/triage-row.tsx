"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, ChevronDown, ExternalLink, Loader2, X, Zap } from "lucide-react";
import type { InboxJob } from "@/lib/career-ops";
import { quickTone } from "@/lib/triage-table.mjs";
import type { AtsSource } from "@/lib/explore";
import { ATS_LABEL } from "@/lib/explore";
import { Badge } from "@/components/ui/badge";
import { CompanyLogo } from "@/components/company-logo";
import { cn } from "@/lib/cn";
import { inboxScoreTarget } from "@/lib/inbox-score-target.mjs";

export type RowScore = { score: number | null; tone: "good" | "warn" | "bad" | "muted"; jobId: string; running: boolean; reportN?: number | null };

function agoLabel(age: number | null): string | null {
  if (age == null) return null;
  if (age <= 0) return "today";
  if (age === 1) return "yesterday";
  if (age < 7) return `${age}d ago`;
  if (age < 30) return `${Math.floor(age / 7)}w ago`;
  return `${Math.floor(age / 30)}mo ago`;
}

// One raw posting in the triage list. Shows ONLY cheap, free signals + an honest
// "not scored" (CRUDA) — never a fake match%. Once its shortlist eval finishes it
// flips to EVALUADA (a real A–F badge). Save→shortlist / Skip→hidden are free + undoable.
export function TriageRow({
  job,
  source,
  age,
  scored,
  selected,
  shortlisted,
  onToggleSelect,
  onSave,
  onSkip,
  quickRunning = false,
  quickError,
  onQuick,
}: {
  job: InboxJob;
  source: AtsSource | null;
  age: number | null;
  scored?: RowScore;
  selected: boolean;
  shortlisted: boolean;
  onToggleSelect: () => void;
  onSave: () => void;
  onSkip: () => void;
  /** Local addition: a quick score (triage) for this row is queued/running. */
  quickRunning?: boolean;
  /** Local addition: the last quick-score attempt failed with this message. */
  quickError?: string;
  /** Local addition: start a quick score (triage) for this row. */
  onQuick?: () => void;
}) {
  const ago = agoLabel(age);
  const target = inboxScoreTarget(scored);
  const evaluated = target.evaluated;
  const quick = job.quick;
  const [open, setOpen] = useState(false);

  return (
    <li
      className={cn(
        "px-3 py-2.5 transition-colors sm:px-4",
        selected ? "bg-brand-soft/50" : "hover:bg-surface-hover",
        evaluated && "opacity-95",
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3">
      {/* multi-select — power-user batch to shortlist */}
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        aria-label={`Select ${job.company} ${job.role}`}
        className="size-4 shrink-0 accent-brand max-sm:min-h-[44px] max-sm:min-w-[24px]"
      />

      <CompanyLogo name={job.company} size={20} />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          <span className="font-medium text-foreground">{job.company}</span>
          <span className="text-muted"> · </span>
          {/* Opens the original posting — free, no scoring involved. */}
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
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-faint">
          {job.location && <span className="truncate">{job.location}</span>}
          {source && <span className="rounded bg-surface-hover px-1 py-px font-medium text-muted">{ATS_LABEL[source]}</span>}
          {ago && <span>{ago}</span>}
          {/* 🔴 CRUDA: honest "not scored" — no fabricated match%. A triage quick score
              (local addition) shows as a verdict badge that opens its reason. */}
          {!evaluated &&
            (quick ? (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                title="Quick score — click for the reason"
                className="inline-flex items-center gap-1 rounded-md transition-opacity hover:opacity-80 max-sm:min-h-[32px]"
              >
                <Badge tone={quickTone(quick.verdict)}>
                  {quick.verdict}
                  {quick.verdict !== "SKIP" && quick.score != null ? ` ${quick.score.toFixed(1)}` : ""}
                </Badge>
                <span className="text-muted">quick</span>
                <ChevronDown className={cn("size-3 text-muted transition-transform", open && "rotate-180")} />
              </button>
            ) : (
              <span className="italic text-muted">not scored</span>
            ))}
          {quickRunning && (
            <span className="inline-flex items-center gap-1 text-brand">
              <Loader2 className="size-3 animate-spin" /> quick scoring…
            </span>
          )}
          {!quickRunning && quickError && (
            <span className="text-red-500" title={quickError}>
              quick score failed
            </span>
          )}
        </p>
      </div>

      {/* EVALUADA state (right-aligned, visually distinct from raw rows) */}
      {evaluated && target.href ? (
        <Link href={target.href} className="flex shrink-0 items-center gap-1.5 text-xs">
          {scored!.running ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-brand" />
              <span className="text-brand max-sm:hidden">Scoring…</span>
            </>
          ) : target.showScore ? (
            <Badge tone={scored!.tone}>{scored!.score}/5</Badge>
          ) : (
            <span className="text-brand">Report</span>
          )}
        </Link>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          {onQuick && (
            <button
              type="button"
              onClick={onQuick}
              disabled={quickRunning}
              title={quick ? "Quick score again (~1 min, few tokens)" : "Quick score (~1 min, few tokens)"}
              aria-label={`Quick score ${job.company} ${job.role}`}
              className={cn(
                "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted transition-colors hover:bg-surface-hover hover:text-brand max-sm:min-h-[44px] max-sm:min-w-[44px]",
                quickRunning && "opacity-60",
              )}
            >
              {quickRunning ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
              <span className="max-sm:hidden">{quick ? "Re-score" : "Quick"}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            title={shortlisted ? "In your shortlist" : "Save to shortlist"}
            aria-pressed={shortlisted}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors max-sm:min-h-[44px] max-sm:min-w-[44px]",
              shortlisted ? "text-brand" : "text-muted hover:bg-surface-hover hover:text-brand",
            )}
          >
            {shortlisted ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
            <span className="max-sm:hidden">{shortlisted ? "Saved" : "Save"}</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            title="Skip — hide from the inbox (restore it from the SKIP tab)"
            className="inline-flex items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-faint transition-colors hover:bg-surface-hover hover:text-foreground max-sm:min-h-[44px] max-sm:min-w-[44px]"
          >
            <X className="size-4" />
            <span className="max-sm:hidden">Skip</span>
          </button>
        </div>
      )}
      </div>

      {/* Quick-score detail (triage reason) — toggled from the badge. */}
      {open && quick && (
        <div className="mt-2 rounded-lg border border-border bg-surface/60 px-3 py-2 text-xs sm:ml-[3.25rem]">
          <p className="text-foreground/90">{quick.reason || "No reason recorded."}</p>
          <p className="mt-1 text-faint">
            Quick score {quick.verdict === "SKIP" || quick.score == null ? "—" : `${quick.score.toFixed(1)}/5`} · {quick.verdict}
            {quick.model && ` · ${quick.model}`}
            {quick.date && ` · ${quick.date}`} — reads only the triage brief, not the full CV. Run a full evaluation before applying.
          </p>
        </div>
      )}
    </li>
  );
}
