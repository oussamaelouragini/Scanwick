import { useEffect, useRef, useState } from "react";
import ScoreCard from "./components/ScoreCard";
import ProblemsList from "./components/ProblemsList";
import RecentAudits from "./components/RecentAudits";
import ResponsivePreview from "./components/ResponsivePreview";
import SeoChecklist from "./components/SeoChecklist";
import { clsTone, lcpTone, scoreTone } from "./rating";
import type { AuditResult, SeoReport, Strategy, ViewportShot } from "./types";

const API = "http://localhost:3000";

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

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 outline-none focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>
      </form>

      {/* Mobile / Desktop toggle */}
      <div className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white p-1 text-sm">
        {(["mobile", "desktop"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setStrategy(option)}
            disabled={loading}
            className={`rounded-md px-3 py-1 capitalize ${
              strategy === option ? "bg-blue-600 text-white" : "text-slate-600"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="mt-8 animate-pulse space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-200" />
            ))}
          </div>
          <div className="h-20 rounded-xl bg-slate-200" />
          <div className="h-20 rounded-xl bg-slate-200" />
          <p className="text-center text-sm text-slate-500">
            Running the audit, this can take up to 30 seconds...
          </p>
        </div>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <section className="mt-8 space-y-8">
          <div>
            <p className="mb-3 break-all text-sm text-slate-500">
              <span className="capitalize">{result.strategy}</span> results for{" "}
              {result.url}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <ScoreCard
                label="Performance score"
                value={`${result.score} / 100`}
                tone={scoreTone(result.score)}
              />
              <ScoreCard
                label="LCP (loading)"
                value={result.lcp ?? "n/a"}
                hint="Good: 2.5 s or less"
                tone={lcpTone(result.lcp)}
              />
              <ScoreCard
                label="CLS (stability)"
                value={result.cls ?? "n/a"}
                hint="Good: 0.1 or less"
                tone={clsTone(result.cls)}
              />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ScoreCard
                label="Page weight"
                value={
                  result.pageWeightMb !== null
                    ? `${result.pageWeightMb} MB`
                    : "n/a"
                }
              />
              <ScoreCard
                label="Network requests"
                value={
                  result.requests !== null ? String(result.requests) : "n/a"
                }
              />
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-slate-900">
              Top problems to fix
            </h2>
            <ProblemsList problems={result.problems} />
          </div>

          <SeoChecklist seo={seo} loading={inspectLoading} />

          <ResponsivePreview
            shots={shots}
            loading={inspectLoading}
            error={inspectError}
          />
        </section>
      )}

      <RecentAudits
        audits={history}
        activeId={result?.id}
        onSelect={handleSelect}
      />
    </div>
  );
}
