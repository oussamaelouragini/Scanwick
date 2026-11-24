import type { AuditResult } from "../types";
import { scoreTone } from "../rating";

type RecentAuditsProps = {
  audits: AuditResult[];
  activeId?: string;
  onSelect: (audit: AuditResult) => void;
};

const scoreColor = {
  good: "text-success",
  average: "text-warning",
  poor: "text-error",
  neutral: "text-on-surface",
};

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RecentAudits({
  audits,
  activeId,
  onSelect,
}: RecentAuditsProps) {
  return (
    <section
      id="recent-audits"
      aria-labelledby="recent-heading"
      className="flex flex-col gap-gutter-md"
    >
      <div className="flex items-center justify-between gap-gutter-sm">
        <h2
          id="recent-heading"
          className="font-headline text-headline-md text-on-surface"
        >
          Recent audits
        </h2>
        <span
          role="status"
          className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-0.5 text-on-surface-variant"
        >
          <span className="font-label text-label-sm tabular-nums">
            {audits.length} saved
          </span>
        </span>
      </div>

      {audits.length === 0 ? (
        <p className="rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg font-body text-body-md text-on-surface-variant">
          No saved audits yet. Run your first audit above.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-gutter-sm sm:grid-cols-2">
          {audits.map((audit) => {
            const active = Boolean(audit.id && audit.id === activeId);
            return (
              <li key={audit.id ?? `${audit.url}-${audit.createdAt}`}>
                <button
                  type="button"
                  onClick={() => onSelect(audit)}
                  className={`flex w-full items-center justify-between gap-gutter-sm rounded-md border bg-surface-container-lowest p-gutter-md text-left shadow-sm transition-colors hover:border-primary/60 ${
                    active
                      ? "border-primary/70"
                      : "border-outline-variant/70"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate font-label text-label-lg text-on-surface">
                      {audit.url}
                    </p>
                    <p className="font-mono text-mono-sm capitalize text-on-surface-variant">
                      {audit.strategy}
                      {audit.createdAt ? ` · ${formatDate(audit.createdAt)}` : ""}
                    </p>
                  </div>
                  <span
                    className={`font-mono text-mono-lg tabular-nums ${scoreColor[scoreTone(audit.score)]}`}
                  >
                    {audit.score}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
