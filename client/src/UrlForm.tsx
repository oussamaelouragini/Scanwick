import { useEffect, useRef, useState } from "react";
import ScoreCard from "./components/ScoreCard";
import ProblemsList from "./components/ProblemsList";
import RecentAudits from "./components/RecentAudits";
import ResponsivePreview from "./components/ResponsivePreview";
import { clsTone, lcpTone, scoreTone } from "./rating";
import type { AuditResult, Strategy, ViewportShot } from "./types";

const API = "http://localhost:3000";

export default function UrlForm() {
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<AuditResult[]>([]);

  const [shots, setShots] = useState<ViewportShot[] | null>(null);
  const [shotsLoading, setShotsLoading] = useState(false);
  const [shotsError, setShotsError] = useState<string | null>(null);
  const shotsRequest = useRef(0); // ignore answers that arrive after a newer request

  // Load the saved audits once, when the page opens
  useEffect(() => {
    fetch(`${API}/api/audits`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {
        // The history is optional: ignore errors silently
      });
  }, []);

  async function loadScreenshots(targetUrl: string) {
    const requestId = ++shotsRequest.current;
    setShots(null);
    setShotsError(null);
    setShotsLoading(true);

    try {
      const res = await fetch(`${API}/api/screenshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl }),
      });
      const data = await res.json();
      if (requestId !== shotsRequest.current) return;
      if (!res.ok) throw new Error(data.error ?? "Could not load screenshots.");
      setShots(data.shots);
    } catch (err) {
      if (requestId !== shotsRequest.current) return;
      setShotsError(
        err instanceof Error ? err.message : "Could not load screenshots.",
      );
    } finally {
      if (requestId === shotsRequest.current) setShotsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setShots(null);
    setShotsError(null);
    shotsRequest.current++; // cancel the display of any pending screenshots

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

      setResult(data as AuditResult);
      // Add the new audit at the top of the history (only if it was saved)
      if ((data as AuditResult).id) {
        setHistory((prev) =>
          [data as AuditResult, ...prev.filter((a) => a.id !== data.id)].slice(
            0,
            10,
          ),
        );
      }
      // The score is shown first, the screenshots load after it
      loadScreenshots((data as AuditResult).url);
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    // Screenshots are not saved, so capture them again
    loadScreenshots(audit.url);
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
                value={result.lcp}
                hint="Good: 2.5 s or less"
                tone={lcpTone(result.lcp)}
              />
              <ScoreCard
                label="CLS (stability)"
                value={result.cls}
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

          <ResponsivePreview
            shots={shots}
            loading={shotsLoading}
            error={shotsError}
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
