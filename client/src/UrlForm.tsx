import { useEffect, useRef, useState } from "react";
import ScoreCard from "./components/ScoreCard";
import MetricCard from "./components/MetricCard";
import ProblemsList from "./components/ProblemsList";
import RecentAudits from "./components/RecentAudits";
import ResponsivePreview from "./components/ResponsivePreview";
import SeoChecklist from "./components/SeoChecklist";
import AiPanel from "./components/AiPanel";
import { clsTone, lcpTone } from "./rating";
import type { AuditResult, SeoReport, Strategy, ViewportShot } from "./types";

const API = "http://localhost:3000";

function formatDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UrlForm() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<AuditResult[]>([]);

  // Browser inspection: screenshots + SEO checklist
  const [shots, setShots] = useState<ViewportShot[] | null>(null);
  const [seo, setSeo] = useState<SeoReport | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const inspectRequest = useRef(0); // ignore answers that arrive after a newer request

  // Load the saved audits once, when the page opens
  useEffect(() => {
    fetch(`${API}/api/audits`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {
        // The history is optional: ignore errors silently
      });
  }, []);

  async function loadInspection(targetUrl: string, auditId?: string) {
    const requestId = ++inspectRequest.current;
    setShots(null);
    setInspectError(null);
    setInspectLoading(true);

    try {
      const res = await fetch(`${API}/api/inspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl, auditId }),
      });
      const data = await res.json();
      if (requestId !== inspectRequest.current) return;
      if (!res.ok) throw new Error(data.error ?? "Could not inspect the page.");
      setShots(data.shots);
      setSeo(data.seo ?? null);
    } catch (err) {
      if (requestId !== inspectRequest.current) return;
      setInspectError(
        err instanceof Error ? err.message : "Could not inspect the page.",
      );
    } finally {
      if (requestId === inspectRequest.current) setInspectLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setShots(null);
    setSeo(null);
    setInspectError(null);
    inspectRequest.current++; // cancel the display of any pending inspection

    // Add https:// if the user typed only "example.com"
    const cleaned = url.trim();
    const fullUrl = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned}`;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl, strategy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");

      const audit = data as AuditResult;
      setResult(audit);
      // Add the new audit at the top of the history (only if it was saved)
      if (audit.id) {
        setHistory((prev) =>
          [audit, ...prev.filter((a) => a.id !== audit.id)].slice(0, 10),
        );
      }
      // The score is shown first, the browser inspection loads after it
      loadInspection(audit.url, audit.id);
    } catch (err) {
      if (err instanceof TypeError) {
        // fetch throws a TypeError when the server cannot be reached
        setError(
          "Cannot reach the Scanwick server. Is it running on port 3000?",
        );
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  // Show a saved audit without calling Google again
  function handleSelect(audit: AuditResult) {
    setError(null);
    setResult(audit);
    setUrl(audit.url);
    setStrategy(audit.strategy);
    setSeo(audit.seo ?? null); // saved SEO checks show immediately
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Screenshots are not saved, so capture them again (this also refreshes the SEO checks)
    loadInspection(audit.url, audit.id);
  }

  const statusText = loading
    ? "Analyzing…"
    : result
      ? result.createdAt
        ? formatDate(result.createdAt)
        : "Results ready"
      : "Ready";
  const statusDot = loading
    ? "bg-warning"
    : result
      ? "bg-success"
      : "bg-outline";

  return (
    <div className="flex w-full flex-col gap-gutter-xl">
      {/* Audit Command Bar */}
      <section
        id="new-audit"
        aria-label="Audit target"
        className="rounded-lg border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm"
      >
        <div className="flex flex-col gap-gutter-md">
          <div className="flex flex-col gap-gutter-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-gutter-sm">
              <h1 className="font-headline text-headline-lg text-on-surface">
                Site audit report
              </h1>
              <span
                role="status"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-0.5 text-on-surface-variant"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusDot}`}
                  aria-hidden="true"
                />
                <span className="font-mono text-mono-sm">{statusText}</span>
              </span>
            </div>

            {/* Mobile / Desktop Emulation Switch */}
            <div
              role="tablist"
              aria-label="Device profile"
              className="inline-flex items-center gap-gutter-xs rounded-base border border-outline-variant bg-surface-container-low p-gutter-xs"
            >
              {(["mobile", "desktop"] as const).map((option) => (
                <button
                  key={option}
                  role="tab"
                  type="button"
                  aria-selected={strategy === option}
                  tabIndex={strategy === option ? 0 : -1}
                  onClick={() => setStrategy(option)}
                  disabled={loading}
                  className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 transition-colors disabled:opacity-50 ${
                    strategy === option
                      ? "bg-primary text-on-primary"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[16px]"
                    aria-hidden="true"
                  >
                    {option === "mobile" ? "smartphone" : "desktop_windows"}
                  </span>
                  <span className="font-label text-label-sm capitalize">
                    {option}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* URL Form */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-gutter-sm sm:flex-row sm:items-center"
          >
            <label className="relative flex flex-1 items-center">
              <span className="sr-only font-label text-label-sm">
                Website URL
              </span>
              <span
                className="material-symbols-outlined pointer-events-none absolute left-3 text-[18px] text-on-surface-variant"
                aria-hidden="true"
              >
                language
              </span>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                inputMode="url"
                required
                className="w-full rounded-base border border-outline-variant bg-surface-container-lowest py-2.5 pr-gutter-md pl-10 font-mono text-body-md text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex shrink-0 items-center justify-center gap-gutter-sm rounded-base bg-primary px-gutter-lg py-2.5 text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                bolt
              </span>
              <span className="font-label text-label-lg">
                {loading ? "Analyzing..." : "Analyze"}
              </span>
            </button>
          </form>
        </div>
      </section>

      {/* Loading skeleton */}
      {loading && (
        <div className="animate-pulse space-y-gutter-md">
          <div className="grid grid-cols-1 items-stretch gap-gutter-md lg:grid-cols-12">
            <div className="h-64 rounded-md bg-surface-container-high lg:col-span-4" />
            <div className="grid grid-cols-1 items-stretch gap-gutter-md sm:grid-cols-2 lg:col-span-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-md bg-surface-container-high" />
              ))}
            </div>
          </div>
          <p className="text-center font-body text-body-sm text-on-surface-variant">
            Running the audit, this can take up to 30 seconds...
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-error-container bg-error-container/30 p-gutter-md font-body text-body-md text-on-error-container">
          {error}
        </p>
      )}

      {result && (
        <>
          {/* Executive Telemetry Grid */}
          <section
            aria-labelledby="metrics-heading"
            className="flex flex-col gap-gutter-md"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-gutter-sm">
              <h2
                id="metrics-heading"
                className="font-headline text-headline-md text-on-surface"
              >
                Performance &amp; Core Web Vitals
              </h2>
              <p className="font-mono text-mono-sm text-on-surface-variant">
                Showing {result.strategy} emulation ·{" "}
                {result.strategy === "mobile" ? "375px" : "1280px"} viewport
              </p>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-gutter-md lg:grid-cols-12">
              <ScoreCard score={result.score} />

              <div className="grid grid-cols-1 items-stretch gap-gutter-md sm:grid-cols-2 lg:col-span-8">
                <MetricCard
                  icon="speed"
                  label="LCP (loading)"
                  value={result.lcp ?? "n/a"}
                  hint="Good: 2.5 s or less"
                  tone={lcpTone(result.lcp)}
                />
                <MetricCard
                  icon="view_quilt"
                  label="CLS (stability)"
                  value={result.cls ?? "n/a"}
                  hint="Good: 0.1 or less"
                  tone={clsTone(result.cls)}
                />
                <MetricCard
                  icon="database"
                  label="Page weight"
                  value={
                    result.pageWeightMb !== null
                      ? `${result.pageWeightMb} MB`
                      : "n/a"
                  }
                  hint="Total transferred payload"
                />
                <MetricCard
                  icon="hub"
                  label="Network requests"
                  value={
                    result.requests !== null ? String(result.requests) : "n/a"
                  }
                  hint="HTTP requests on initial load"
                />
              </div>
            </div>
          </section>

          {/* Two-Column Diagnostics: Top Problems + SEO Checks */}
          <div className="grid grid-cols-1 items-start gap-gutter-xl lg:grid-cols-12">
            <section
              aria-labelledby="problems-heading"
              className={`flex flex-col gap-gutter-md ${
                seo || inspectLoading ? "lg:col-span-7" : "lg:col-span-12"
              }`}
            >
              <div className="flex items-center justify-between gap-gutter-sm">
                <h2
                  id="problems-heading"
                  className="font-headline text-headline-md text-on-surface"
                >
                  Top problems to fix
                </h2>
                <span
                  role="status"
                  className="inline-flex items-center rounded-full bg-surface-container-high px-2.5 py-0.5 text-on-surface-variant"
                >
                  <span className="font-label text-label-sm tabular-nums">
                    {result.problems.length}{" "}
                    {result.problems.length === 1
                      ? "opportunity"
                      : "opportunities"}
                  </span>
                </span>
              </div>

              <ProblemsList problems={result.problems} />
            </section>

            <SeoChecklist seo={seo} loading={inspectLoading} />
          </div>

          <ResponsivePreview
            shots={shots}
            loading={inspectLoading}
            error={inspectError}
          />

          <AiPanel
            key={`${result.url}-${result.strategy}-${result.score}`}
            audit={result}
            seo={seo}
            shots={shots}
            ready={!inspectLoading}
          />
        </>
      )}

      <RecentAudits
        audits={history}
        activeId={result?.id}
        onSelect={handleSelect}
      />
    </div>
  );
}
