import { useState } from "react";
import type {
  AuditResult,
  Recommendation,
  SeoReport,
  ViewportShot,
} from "../types";

const API = "http://localhost:3000";

const STACKS = ["Any", "React", "Next.js", "WordPress", "HTML/CSS"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "tr", label: "Türkçe" },
];

// Full class names (not built dynamically) so Tailwind can detect them
const priorityStyle: Record<Recommendation["priority"], string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

type AiPanelProps = {
  audit: AuditResult;
  seo: SeoReport | null;
  shots: ViewportShot[] | null;
  ready: boolean; // false while the SEO checks and screenshots are still loading
};

function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked: ignore
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

export default function AiPanel({ audit, seo, shots, ready }: AiPanelProps) {
  const [stack, setStack] = useState("Any");
  const [language, setLanguage] = useState("en");

  const [recommendations, setRecommendations] = useState<
    Recommendation[] | null
  >(null);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Send only what the AI needs (no screenshot images)
  function basePayload() {
    return {
      audit,
      seo,
      shots: shots?.map(({ label, width, overflowing, pageWidth }) => ({
        label,
        width,
        overflowing,
        pageWidth,
      })),
    };
  }

  async function postAi<T>(path: string, body: object): Promise<T> {
    try {
      const res = await fetch(`${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "The AI request failed.");
      return data as T;
    } catch (err) {
      if (err instanceof TypeError) {
        throw new Error(
          "Cannot reach the Scanwick server. Is it running on port 3000?",
        );
      }
      throw err;
    }
  }

  async function generateRecommendations() {
    setRecsError(null);
    setRecsLoading(true);
    try {
      const data = await postAi<{ recommendations: Recommendation[] }>(
        "/api/ai/recommendations",
        { ...basePayload(), stack },
      );
      setRecommendations(data.recommendations);
    } catch (err) {
      setRecsError(
        err instanceof Error ? err.message : "The AI request failed.",
      );
    } finally {
      setRecsLoading(false);
    }
  }

  async function generateSummary() {
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      const data = await postAi<{ summary: string }>("/api/ai/summary", {
        ...basePayload(),
        language,
      });
      setSummary(data.summary);
    } catch (err) {
      setSummaryError(
        err instanceof Error ? err.message : "The AI request failed.",
      );
    } finally {
      setSummaryLoading(false);
    }
  }

  const selectClass =
    "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500";

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-slate-900">
        AI assistant
      </h2>
      <p className="mb-4 text-sm text-slate-500">
        The AI only uses the measurements above. Every recommendation shows the
        data it comes from.
        {!ready && " Waiting for the SEO checks and screenshots to finish..."}
      </p>

      {/* Recommendations */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">Your stack</span>
            <select
              value={stack}
              onChange={(e) => setStack(e.target.value)}
              className={selectClass}
            >
              {STACKS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={generateRecommendations}
            disabled={!ready || recsLoading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {recsLoading ? "Thinking..." : "Generate fix recommendations"}
          </button>
        </div>

        {recsError && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {recsError}
          </p>
        )}

        {recsLoading && (
          <div className="mt-4 animate-pulse space-y-3">
            <div className="h-24 rounded-xl bg-slate-200" />
            <div className="h-24 rounded-xl bg-slate-200" />
          </div>
        )}

        {recommendations && !recsLoading && (
          <ul className="mt-4 space-y-4">
            {recommendations.map((rec, index) => (
              <li
                key={`${rec.title}-${index}`}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-medium text-slate-900">{rec.title}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${priorityStyle[rec.priority]}`}
                  >
                    {rec.priority} priority
                  </span>
                </div>

                <p className="mt-2 text-sm text-slate-600">{rec.why}</p>

                {rec.steps.length > 0 && (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-600">
                    {rec.steps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                )}

                {rec.code && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        Suggested code
                      </span>
                      <CopyButton text={rec.code} />
                    </div>
                    <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
                      <code>{rec.code}</code>
                    </pre>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {rec.evidence.map((item) => (
                    <span
                      key={item.key}
                      className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700"
                      title={item.key}
                    >
                      {item.key}: {item.value}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Client summary */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="text-sm text-slate-600">
            <span className="mb-1 block">Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className={selectClass}
            >
              {LANGUAGES.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={generateSummary}
            disabled={!ready || summaryLoading}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {summaryLoading ? "Writing..." : "Write client summary"}
          </button>
        </div>

        {summaryError && (
          <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {summaryError}
          </p>
        )}

        {summaryLoading && (
          <div className="mt-4 h-28 animate-pulse rounded-xl bg-slate-200" />
        )}

        {summary && !summaryLoading && (
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Ready to send to your client
              </span>
              <CopyButton text={summary} />
            </div>
            <p className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {summary}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
