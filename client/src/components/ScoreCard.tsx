import type { Tone } from "../rating";

type ScoreCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
};

// Full class names (not built dynamically) so Tailwind can detect them
const toneClasses: Record<Tone, { value: string; badge: string }> = {
  good: { value: "text-green-600", badge: "bg-green-100 text-green-700" },
  average: { value: "text-amber-600", badge: "bg-amber-100 text-amber-700" },
  poor: { value: "text-red-600", badge: "bg-red-100 text-red-700" },
  neutral: { value: "text-slate-900", badge: "bg-slate-100 text-slate-600" },
};

const toneLabel: Record<Tone, string> = {
  good: "Good",
  average: "Needs work",
  poor: "Poor",
  neutral: "",
};

export default function ScoreCard({
  label,
  value,
  hint,
  tone = "neutral",
}: ScoreCardProps) {
  const classes = toneClasses[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{label}</p>
        {tone !== "neutral" && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${classes.badge}`}
          >
            {toneLabel[tone]}
          </span>
        )}
      </div>
      <p className={`mt-2 text-3xl font-semibold ${classes.value}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
