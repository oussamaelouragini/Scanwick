import { scoreTone, type Tone } from "../rating";

const ringColor: Record<Tone, string> = {
  good: "text-success",
  average: "text-warning",
  poor: "text-error",
  neutral: "text-on-surface",
};

const badgeClass: Record<Tone, string> = {
  good: "bg-success-container text-on-success-container",
  average: "bg-warning-container text-on-warning-container",
  poor: "bg-error-container text-on-error-container",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

const badgeLabel: Record<Tone, string> = {
  good: "Good",
  average: "Needs work",
  poor: "Poor",
  neutral: "No data",
};

const summaryText: Record<Tone, string> = {
  good: "This page meets the core performance targets.",
  average: "Some performance opportunities remain before this page is fully optimized.",
  poor: "Critical loading and layout shift bottlenecks detected.",
  neutral: "No performance score was returned for this page.",
};

const circumference = 2 * Math.PI * 42;

export default function ScoreCard({ score }: { score: number }) {
  const tone = scoreTone(score);
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <article className="flex h-full flex-col justify-between gap-gutter-lg rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm lg:col-span-4">
      <header className="flex items-center justify-between gap-gutter-sm">
        <h3 className="font-title text-title-md text-on-surface">
          Performance score
        </h3>
        <span
          role="status"
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${badgeClass[tone]}`}
        >
          <span className="font-label text-label-sm">{badgeLabel[tone]}</span>
        </span>
      </header>

      <div className="flex items-center gap-gutter-lg py-gutter-xs">
        <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
          <svg className="h-28 w-28 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-surface-container-high"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className={ringColor[tone]}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-mono text-mono-lg tabular-nums ${ringColor[tone]}`}>
              {score}
            </span>
            <span className="font-label text-label-sm text-on-surface-variant">
              / 100
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-gutter-xs">
          <p className="text-pretty font-body text-body-md text-on-surface">
            {summaryText[tone]}
          </p>
          <p className="text-balance font-body text-body-sm text-on-surface-variant">
            Aim for 90 or more for a good result.
          </p>
        </div>
      </div>

      <footer className="flex items-center justify-between border-t border-outline-variant/50 pt-gutter-sm">
        <span className="font-label text-label-sm text-on-surface-variant">
          Target threshold
        </span>
        <span className="font-mono text-mono-sm tabular-nums text-on-surface-variant">
          90+ Good
        </span>
      </footer>
    </article>
  );
}
