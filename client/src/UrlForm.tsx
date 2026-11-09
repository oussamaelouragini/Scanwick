import { useState } from "react";

type AuditResult = {
  url: string;
  score: number;
  lcp: string;
  cls: string;
};

function scoreColor(score: number) {
  if (score >= 90) return "text-green-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function Card({
  label,
  value,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${valueClass}`}>{value}</p>
    </div>
  );
}

export default function UrlForm() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuditResult | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Add https:// if the user typed only "example.com"
    const cleaned = url.trim();
    const fullUrl = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned}`;

    setLoading(true);
    try {
      const res = await fetch("http://localhost:3000/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: fullUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-blue-500"
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

      {loading && (
        <p className="mt-4 text-sm text-slate-500">
          Running the audit, this can take up to 30 seconds...
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-slate-500">
            Mobile results for {result.url}
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              label="Performance score"
              value={`${result.score} / 100`}
              valueClass={scoreColor(result.score)}
            />
            <Card label="LCP (loading)" value={result.lcp} />
            <Card label="CLS (stability)" value={result.cls} />
          </div>
        </div>
      )}
    </div>
  );
}
