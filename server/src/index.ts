import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDb } from "./db";
import { Audit } from "./models/Audit";
import { captureScreenshots } from "./screenshots";

dotenv.config();

const app = express();
const PORT = 3000;
const API_KEY = process.env.PSI_API_KEY;
let dbReady = false;

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};

// Returns a valid http(s) URL, or null
function parseHttpUrl(input: unknown): URL | null {
  if (typeof input !== "string") return null;
  try {
    const parsed = new URL(input);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

// Our own browser opens the URL, so refuse local and private addresses
function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal"))
    return true;
  if (h === "[::1]" || h === "::1") return true;

  const ip = h.match(/^(\d+)\.(\d+)\.\d+\.\d+$/);
  if (ip) {
    const a = Number(ip[1]);
    const b = Number(ip[2]);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  return false;
}

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

// Run a new audit and (if MongoDB is connected) save it
app.post("/api/audit", async (req, res) => {
  const strategy: "mobile" | "desktop" =
    req.body?.strategy === "desktop" ? "desktop" : "mobile";
  if (!req.body?.url || typeof req.body.url !== "string") {
    res.status(400).json({ error: "A url is required." });
    return;
  }

  const parsed = parseHttpUrl(req.body.url);
  if (!parsed) {
    res
      .status(400)
      .json({ error: "Invalid URL. Example: https://example.com" });
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
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", API_KEY);

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(60_000),
    });
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

    const payload = {
      url: parsed.href,
      strategy,
      score: Math.round(lighthouse.categories.performance.score * 100),
      lcp: audits["largest-contentful-paint"].displayValue as string,
      cls: audits["cumulative-layout-shift"].displayValue as string,
      pageWeightMb: weightBytes
        ? Math.round((weightBytes / 1_000_000) * 100) / 100
        : null,
      requests: Array.isArray(requestItems) ? requestItems.length : null,
      problems: extractProblems(audits),
    };

    // Save to MongoDB. A saving error must not break the audit response.
    let saved: { id?: string; createdAt?: Date } = {};
    if (dbReady) {
      try {
        const doc = await Audit.create(payload);
        saved = { id: String(doc._id), createdAt: doc.get("createdAt") };
      } catch (err) {
        console.error("Could not save audit:", err);
      }
    }

    res.json({ ...payload, ...saved });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      res.status(504).json({
        error: "The audit took too long. Try again or test another URL.",
      });
      return;
    }
    console.error(err);
    res.status(502).json({ error: "Could not reach the PageSpeed API." });
  }
});

// Screenshots at phone, tablet and desktop widths (not saved in MongoDB)
app.post("/api/screenshots", async (req, res) => {
  const parsed = parseHttpUrl(req.body?.url);

  if (!parsed) {
    res
      .status(400)
      .json({ error: "Invalid URL. Example: https://example.com" });
    return;
  }

  if (isPrivateHost(parsed.hostname)) {
    res
      .status(400)
      .json({ error: "Local and private addresses are not allowed." });
    return;
  }

  try {
    const shots = await captureScreenshots(parsed.href);
    res.json({ url: parsed.href, shots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not capture screenshots." });
  }
});

// The 10 most recent saved audits
app.get("/api/audits", async (_req, res) => {
  if (!dbReady) {
    res.json([]);
    return;
  }

  try {
    const audits = await Audit.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean<any[]>();
    res.json(
      audits.map((a) => ({
        id: String(a._id),
        url: a.url,
        strategy: a.strategy,
        score: a.score,
        lcp: a.lcp,
        cls: a.cls,
        pageWeightMb: a.pageWeightMb ?? null,
        requests: a.requests ?? null,
        problems: a.problems ?? [],
        createdAt: a.createdAt,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load audit history." });
  }
});

async function start() {
  dbReady = await connectDb();
  app.listen(PORT, () => {
    console.log(`Scanwick server running on http://localhost:${PORT}`);
  });
}

start();
