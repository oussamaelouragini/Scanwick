import { useState } from "react";
import type {
  AuditResult,
  Recommendation,
  SeoReport,
  ViewportShot,
} from "../types";

const API = "http://localhost:3000";

type ReportExportProps = {
  audit: AuditResult;
  seo: SeoReport | null;
  shots: ViewportShot[] | null;
  recommendations: Recommendation[] | null;
  summary: string | null;
  ready: boolean; // false while the SEO checks and screenshots are still loading
};

export default function ReportExport({
  audit,
  seo,
  shots,
  recommendations,
  summary,
  ready,
}: ReportExportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audit, seo, shots, recommendations, summary }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not create the PDF.");
      }

      // Turn the answer into a file and start the download
      const blob = await res.blob();
      const link = document.createElement("a");
      const host = new URL(audit.url).hostname.replace(/[^a-z0-9.-]/gi, "");
      link.href = URL.createObjectURL(blob);
      link.download = `scanwick-${host}-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot reach the Scanwick server. Is it running on port 3000?",
        );
      } else {
        setError(
          err instanceof Error ? err.message : "Could not create the PDF.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-medium text-slate-900">Export</h3>
      <p className="mt-1 text-sm text-slate-500">
        The PDF includes the results, problems, SEO checks and screenshots
        {recommendations || summary
          ? ", plus the AI parts you generated."
          : "."}{" "}
        {!recommendations &&
          !summary &&
          "Generate the AI parts first if you want them inside."}
      </p>

      <button
        type="button"
        onClick={download}
        disabled={!ready || loading}
        className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? "Creating PDF..." : "Download PDF report"}
      </button>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
