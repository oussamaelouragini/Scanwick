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
    <div className="flex flex-col gap-gutter-md rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm">
      <h3 className="font-title text-title-md text-on-surface">Export</h3>
      <p className="font-body text-body-sm text-on-surface-variant">
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
        className="inline-flex w-fit items-center justify-center gap-gutter-sm rounded-base bg-secondary px-gutter-lg py-2.5 text-on-secondary transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
          picture_as_pdf
        </span>
        <span className="font-label text-label-lg">
          {loading ? "Creating PDF..." : "Download PDF report"}
        </span>
      </button>

      {error && (
        <p className="rounded-md border border-error-container bg-error-container/30 p-gutter-md font-body text-body-md text-on-error-container">
          {error}
        </p>
      )}
    </div>
  );
}
