import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const API_KEY = process.env.PSI_API_KEY;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};

// Remove markdown links and backticks from Lighthouse descriptions
function cleanText(text: string): string {
  return text
    .replace(/\s*\[Learn [^\]]*\]\([^)]*\)\.?/gi, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`/g, "")
    .trim();
}

// Find the audits that failed and could save time or bytes, biggest first
function extractProblems(audits: Record<string, any>): Problem[] {
  return Object.entries(audits)
    .map(([id, audit]) => {
      const metricSavings = audit.metricSavings ?? {};
      const savingsMs = Math.max(
        audit.details?.overallSavingsMs ?? 0,
        metricSavings.LCP ?? 0,
        metricSavings.FCP ?? 0,
      );
      const savingsBytes = audit.details?.overallSavingsBytes ?? 0;
      return { id, audit, savingsMs, savingsBytes };
    })
    .filter(
      ({ audit, savingsMs, savingsBytes }) =>
        (audit.score === null || audit.score < 0.9) &&
        (savingsMs > 0 || savingsBytes > 0),
    )
    .sort(
      (a, b) => b.savingsMs - a.savingsMs || b.savingsBytes - a.savingsBytes,
    )
    .slice(0, 5)
    .map(({ id, audit, savingsMs, savingsBytes }) => ({
      id,
      title: audit.title as string,
      description: cleanText((audit.description as string) ?? ""),
      savingsMs: Math.round(savingsMs),
      savingsKb: Math.round(savingsBytes / 1024),
    }));
}

app.post("/api/audit", async (req, res) => {
  const { url } = req.body ?? {};
  const strategy = req.body?.strategy === "desktop" ? "desktop" : "mobile";

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "A url is required." });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res
      .status(400)
      .json({ error: "Invalid URL. Example: https://example.com" });
    return;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    res.status(400).json({ error: "Only http and https URLs are allowed." });
    return;
  }

  if (!API_KEY) {
    res.status(500).json({ error: "PSI_API_KEY is missing in server/.env" });
    return;
  }

  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );
  endpoint.searchParams.set("url", parsed.href);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", API_KEY);
  endpoint.searchParams.set("strategy", strategy);

  try {
    const response = await fetch(endpoint);
    const data: any = await response.json();

    if (!response.ok) {
      res
        .status(response.status)
        .json({ error: data?.error?.message ?? "PageSpeed request failed." });
      return;
    }

    const lighthouse = data.lighthouseResult;
    const audits = lighthouse.audits;

    const weightBytes = audits["total-byte-weight"]?.numericValue;
    const requestItems = audits["network-requests"]?.details?.items;

    res.json({
      url: parsed.href,
      score: Math.round(lighthouse.categories.performance.score * 100),
      lcp: audits["largest-contentful-paint"].displayValue,
      cls: audits["cumulative-layout-shift"].displayValue,
      pageWeightMb: weightBytes
        ? Math.round((weightBytes / 1_000_000) * 100) / 100
        : null,
      requests: Array.isArray(requestItems) ? requestItems.length : null,
      problems: extractProblems(audits),
      strategy,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not reach the PageSpeed API." });
  }
});

app.listen(PORT, () => {
  console.log(`Scanwick server running on http://localhost:${PORT}`);
});
