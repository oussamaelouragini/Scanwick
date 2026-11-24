import type { Tone } from "../rating";

const valueClass: Record<Tone, string> = {
  good: "text-success",
  average: "text-warning",
  poor: "text-error",
  neutral: "text-on-surface",
};

const badgeClass: Record<Tone, string> = {
  good: "bg-success-container text-on-success-container",
  average: "bg-warning-container text-on-warning-container",
  poor: "bg-error-container text-on-error-container",
  neutral: "",
};

const badgeLabel: Record<Tone, string> = {
  good: "Good",
  average: "Needs work",
  poor: "Poor",
  neutral: "",
};

type MetricCardProps = {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
};

export default function MetricCard({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
}: MetricCardProps) {
  return (
    <article className="flex h-full flex-col justify-between gap-gutter-md rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm">
      <header className="flex items-center justify-between gap-gutter-sm">
        <span className="flex items-center gap-gutter-xs text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {icon}
          </span>
          <h3 className="font-label text-label-lg text-on-surface">{label}</h3>
        </span>
        {tone !== "neutral" && (
          <span
            role="status"
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 ${badgeClass[tone]}`}
          >
            <span className="font-label text-label-sm">{badgeLabel[tone]}</span>
          </span>
        )}
      </header>
      <div className="flex flex-col gap-gutter-xs">
        <p className={`font-mono text-mono-lg tabular-nums ${valueClass[tone]}`}>
          {value}
        </p>
        {hint && (
          <p className="font-body text-body-sm text-on-surface-variant">{hint}</p>
        )}
      </div>
    </article>
  );
}
