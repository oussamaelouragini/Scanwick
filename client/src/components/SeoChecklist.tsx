import type { SeoReport, SeoStatus } from "../types";

type SeoChecklistProps = {
  seo: SeoReport | null;
  loading: boolean;
};

const statusStyle: Record<
  SeoStatus,
  { icon: string; color: string; label: string }
> = {
  pass: { icon: "check_circle", color: "text-success", label: "Passed" },
  warn: { icon: "warning", color: "text-warning", label: "Could be better" },
  fail: { icon: "cancel", color: "text-error", label: "Needs fixing" },
};

export default function SeoChecklist({ seo, loading }: SeoChecklistProps) {
  // Nothing to show: the screenshots section already displays any error
  if (!seo && !loading) return null;

  const allPassed = seo ? seo.passed === seo.total : false;

  return (
    <section
      aria-labelledby="seo-heading"
      className="flex flex-col gap-gutter-md lg:col-span-5"
    >
      <div className="flex items-center justify-between gap-gutter-sm">
        <h2
          id="seo-heading"
          className="font-headline text-headline-md text-on-surface"
        >
          SEO checks
        </h2>
        {seo && (
          <span
            role="status"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${
              allPassed
                ? "bg-success-container text-on-success-container"
                : "bg-warning-container text-on-warning-container"
            }`}
          >
            <span className="font-label text-label-sm tabular-nums">
              {seo.passed} of {seo.total} passed
            </span>
          </span>
        )}
      </div>

      {!seo && loading && (
        <div className="animate-pulse space-y-gutter-sm">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-md bg-surface-container-high" />
          ))}
        </div>
      )}

      {seo && (
        <ul className="divide-y divide-outline-variant/50 rounded-md border border-outline-variant/70 bg-surface-container-lowest shadow-sm">
          {seo.checks.map((check) => {
            const style = statusStyle[check.status];
            return (
              <li
                key={check.id}
                className="flex items-start gap-gutter-sm p-gutter-md"
              >
                <span
                  className={`material-symbols-outlined mt-0.5 shrink-0 text-[20px] ${style.color}`}
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  title={style.label}
                  aria-label={style.label}
                >
                  {style.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-label text-label-lg text-on-surface">
                    {check.label}
                  </p>
                  <p className="break-words font-body text-body-sm text-on-surface-variant">
                    {check.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
