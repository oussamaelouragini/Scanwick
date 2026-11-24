import { useState } from "react";
import type {
  AuditResult,
  Recommendation,
  SeoReport,
  ViewportShot,
} from "../types";
import { API } from "../api";
import ReportExport from "./ReportExport";

const STACKS = ["Any", "React", "Next.js", "WordPress", "HTML/CSS"];
const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "tr", label: "Türkçe" },
];

const priorityStyle: Record<Recommendation["priority"], string> = {
  high: "bg-error-container text-on-error-container",
  medium: "bg-warning-container text-on-warning-container",
  low: "bg-surface-container-high text-on-surface-variant",
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
      className="rounded-base border border-outline-variant bg-surface-container-lowest px-2 py-0.5 font-label text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
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
    "rounded-base border border-outline-variant bg-surface-container-lowest px-3 py-2 font-body text-body-md text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
  const primaryButton =
    "inline-flex shrink-0 items-center justify-center gap-gutter-sm rounded-base bg-primary px-gutter-lg py-2.5 text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";
  const secondaryButton =
    "inline-flex shrink-0 items-center justify-center gap-gutter-sm rounded-base border border-outline-variant bg-inverse-surface px-gutter-lg py-2.5 text-inverse-on-surface transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";

  return (
    <section aria-labelledby="ai-heading" className="flex flex-col gap-gutter-md">
      <div className="flex flex-wrap items-baseline justify-between gap-gutter-sm">
        <div className="flex items-center gap-gutter-sm">
          <span
            className="material-symbols-outlined text-[20px] text-primary"
            aria-hidden="true"
          >
            auto_awesome
          </span>
          <h2
            id="ai-heading"
            className="font-headline text-headline-md text-on-surface"
          >
            AI assistant
          </h2>
        </div>
        <p className="font-body text-body-sm text-on-surface-variant">
          The AI only uses the measurements above. Every recommendation shows
          the data it comes from.
          {!ready && " Waiting for the SEO checks and screenshots to finish..."}
        </p>
      </div>

      {/* Fix Recommendations Panel */}
      <div className="flex flex-col gap-gutter-lg rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm">
        <div className="flex flex-col gap-gutter-sm border-b border-outline-variant/50 pb-gutter-md sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-gutter-xs">
            <span className="font-label text-label-sm text-on-surface-variant">
              Your stack
            </span>
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
            className={primaryButton}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              auto_fix_high
            </span>
            <span className="font-label text-label-lg">
              {recsLoading
                ? "Thinking..."
                : "Generate fix recommendations"}
            </span>
          </button>
        </div>

        {recsError && (
          <p className="rounded-md border border-error-container bg-error-container/30 p-gutter-md font-body text-body-md text-on-error-container">
            {recsError}
          </p>
        )}

        {recsLoading && (
          <div className="animate-pulse space-y-gutter-md">
            <div className="h-40 rounded-md bg-surface-container-high" />
            <div className="h-40 rounded-md bg-surface-container-high" />
          </div>
        )}

        {recommendations && !recsLoading && (
          <ul className="grid grid-cols-1 items-stretch gap-gutter-md lg:grid-cols-2">
            {recommendations.map((rec, index) => (
              <li
                key={`${rec.title}-${index}`}
                className="flex h-full flex-col justify-between gap-gutter-md rounded-md border border-outline-variant/70 bg-surface-container-low/40 p-gutter-lg"
              >
                <div className="flex flex-col gap-gutter-sm">
                  <div className="flex flex-wrap items-start justify-between gap-gutter-sm">
                    <h3 className="font-title text-title-md text-on-surface">
                      {rec.title}
                    </h3>
                    <span
                      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 ${priorityStyle[rec.priority]}`}
                    >
                      <span className="font-label text-label-sm capitalize">
                        {rec.priority} priority
                      </span>
                    </span>
                  </div>

                  <p className="font-body text-body-md text-on-surface-variant">
                    {rec.why}
                  </p>

                  {rec.steps.length > 0 && (
                    <ol className="list-decimal space-y-1 pl-5 font-body text-body-sm text-on-surface-variant">
                      {rec.steps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  )}
                </div>

                <div className="flex flex-col gap-gutter-sm">
                  {rec.code && (
                    <div className="flex flex-col gap-gutter-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-label text-label-sm text-on-surface-variant">
                          Suggested code
                        </span>
                        <CopyButton text={rec.code} />
                      </div>
                      <pre className="overflow-x-auto rounded-base bg-inverse-surface p-3 font-mono text-mono-sm text-inverse-on-surface">
                        <code>{rec.code}</code>
                      </pre>
                    </div>
                  )}

                  {rec.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rec.evidence.map((item) => (
                        <span
                          key={item.key}
                          title={item.key}
                          className="inline-flex rounded-full bg-surface-container-high px-2.5 py-0.5 font-mono text-mono-sm text-primary"
                        >
                          {item.key}: {item.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Client Summary Generator */}
      <div className="flex flex-col gap-gutter-md rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm">
        <div className="flex flex-col gap-gutter-sm sm:flex-row sm:items-end sm:justify-between">
          <label className="flex flex-col gap-gutter-xs">
            <span className="font-label text-label-sm text-on-surface-variant">
              Language
            </span>
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
            className={secondaryButton}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              edit_note
            </span>
            <span className="font-label text-label-lg">
              {summaryLoading ? "Writing..." : "Write client summary"}
            </span>
          </button>
        </div>

        {summaryError && (
          <p className="rounded-md border border-error-container bg-error-container/30 p-gutter-md font-body text-body-md text-on-error-container">
            {summaryError}
          </p>
        )}

        {summaryLoading && (
          <div className="h-28 animate-pulse rounded-base bg-surface-container-high" />
        )}

        {summary && !summaryLoading && (
          <div className="flex flex-col gap-gutter-xs">
            <div className="flex items-center justify-between">
              <span className="font-label text-label-sm text-on-surface-variant">
                Ready to send to your client
              </span>
              <CopyButton text={summary} />
            </div>
            <p className="whitespace-pre-wrap rounded-base bg-surface-container-low p-gutter-md text-pretty font-body text-body-md text-on-surface">
              {summary}
            </p>
          </div>
        )}
      </div>

      <ReportExport
        audit={audit}
        seo={seo}
        shots={shots}
        recommendations={recommendations}
        summary={summary}
        ready={ready}
      />
    </section>
  );
}
