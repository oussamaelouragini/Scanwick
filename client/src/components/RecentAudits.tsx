import type { AuditResult } from "../types";
import { scoreTone } from "../rating";

type RecentAuditsProps = {
  audits: AuditResult[];
  activeId?: string;
  onSelect: (audit: AuditResult) => void;
};

const scoreColor = {
  good: "text-green-600",
  average: "text-amber-600",
  poor: "text-red-600",
  neutral: "text-slate-900",
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
  if (audits.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Recent audits
      </h2>
      <ul className="space-y-2">
        {audits.map((audit) => (
          <li key={audit.id ?? `${audit.url}-${audit.createdAt}`}>
            <button
              type="button"
              onClick={() => onSelect(audit)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white p-3 text-left shadow-sm hover:border-blue-400 ${
                audit.id && audit.id === activeId
                  ? "border-blue-500"
                  : "border-slate-200"
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {audit.url}
                </p>
                <p className="text-xs capitalize text-slate-400">
                  {audit.strategy} · {formatDate(audit.createdAt)}
                </p>
              </div>
              <span
                className={`text-lg font-semibold ${scoreColor[scoreTone(audit.score)]}`}
              >
                {audit.score}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
