import type { SeoReport, SeoStatus } from "../types";

type SeoChecklistProps = {
  seo: SeoReport | null;
  loading: boolean;
};

// Full class names (not built dynamically) so Tailwind can detect them
const statusStyle: Record<
  SeoStatus,
  { icon: string; circle: string; text: string }
> = {
  pass: { icon: "✓", circle: "bg-green-100 text-green-700", text: "Passed" },
  warn: {
    icon: "!",
    circle: "bg-amber-100 text-amber-700",
    text: "Could be better",
  },
  fail: { icon: "✕", circle: "bg-red-100 text-red-700", text: "Needs fixing" },
};

export default function SeoChecklist({ seo, loading }: SeoChecklistProps) {
  // Nothing to show: the screenshots section already displays any error
  if (!seo && !loading) return null;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-900">SEO checks</h2>
        {seo && (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {seo.passed} of {seo.total} passed
          </span>
        )}
      </div>

      {!seo && loading && (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-200" />
          ))}
        </div>
      )}

      {seo && (
        <ul className="space-y-2">
          {seo.checks.map((check) => {
            const style = statusStyle[check.status];
            return (
              <li
                key={check.id}
                className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold ${style.circle}`}
                  title={style.text}
                  aria-label={style.text}
                >
                  {style.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {check.label}
                  </p>
                  <p className="break-words text-sm text-slate-500">
                    {check.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
