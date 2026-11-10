import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDb } from "./db";
import { Audit } from "./models/Audit";

dotenv.config();

// ======================================
// Configuration
// ======================================

const app = express();

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.PSI_API_KEY;

let dbReady = false;

type Strategy = "mobile" | "desktop";

type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};

// ======================================
// Middlewares
// ======================================

app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use(express.json());

// ======================================
// Clean Lighthouse descriptions
// ======================================

function cleanText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`/g, "")
    .trim();
}

// ======================================
// Extract performance problems
// ======================================

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

      return {
        id,
        audit,
        savingsMs,
        savingsBytes,
      };
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

// ======================================
// Health check
// ======================================

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    database: dbReady ? "connected" : "disconnected",
    service: "Scanwick API",
  });
});

// ======================================
// Run PageSpeed audit
// ======================================

app.post("/api/audit", async (req, res) => {
  const { url } = req.body ?? {};

  const strategy: Strategy =
    req.body?.strategy === "desktop" ? "desktop" : "mobile";

  // Validate URL
  if (!url || typeof url !== "string") {
    res.status(400).json({
      error: "A url is required.",
    });
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({
      error: "Invalid URL. Example: https://example.com",
    });
    return;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    res.status(400).json({
      error: "Only http and https URLs are allowed.",
    });
    return;
  }

  // Check API key
  if (!API_KEY) {
    res.status(500).json({
      error: "PSI_API_KEY is missing in server/.env",
    });
    return;
  }

  // PageSpeed API endpoint
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
      res.status(response.status).json({
        error: data?.error?.message ?? "PageSpeed request failed.",
      });
      return;
    }

    const lighthouse = data.lighthouseResult;

    if (!lighthouse?.audits) {
      res.status(502).json({
        error: "Invalid PageSpeed response.",
      });
      return;
    }

    const audits = lighthouse.audits;

    // Extract metrics
    const weightBytes = audits["total-byte-weight"]?.numericValue;

    const requestItems = audits["network-requests"]?.details?.items;

    // Build payload
    const payload = {
      url: parsed.href,
      strategy: strategy as Strategy,

      score: Math.round(lighthouse.categories.performance.score * 100),

      lcp: audits["largest-contentful-paint"]?.displayValue ?? "N/A",

      cls: audits["cumulative-layout-shift"]?.displayValue ?? "N/A",

      pageWeightMb: weightBytes
        ? Math.round((weightBytes / 1_000_000) * 100) / 100
        : null,

      requests: Array.isArray(requestItems) ? requestItems.length : null,

      problems: extractProblems(audits),
    };

    // ======================================
    // Save audit to MongoDB
    // ======================================

    let saved: {
      id?: string;
      createdAt?: Date;
    } = {};

    if (dbReady) {
      try {
        const doc = await Audit.create(payload);

        saved = {
          id: String(doc._id),
          createdAt: doc.get("createdAt") as Date,
        };

        console.log("Audit saved:", doc._id);
      } catch (err) {
        console.error("Could not save audit:", err);
      }
    }

    // Return result
    res.json({
      ...payload,
      ...saved,
    });
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      res.status(504).json({
        error: "The audit took too long. Try again or test another URL.",
      });
      return;
    }

    console.error("PageSpeed API error:", err);

    res.status(502).json({
      error: "Could not reach the PageSpeed API.",
    });
  }
});

// ======================================
// Get latest 10 audits
// ======================================

app.get("/api/audits", async (_req, res) => {
  if (!dbReady) {
    res.json([]);
    return;
  }

  try {
    const audits = await Audit.find().sort({ createdAt: -1 }).limit(10).lean();

    res.json(
      audits.map((a: any) => ({
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
    console.error("Could not load audits:", err);

    res.status(500).json({
      error: "Could not load audit history.",
    });
  }
});

// ======================================
// Start server
// ======================================

async function start(): Promise<void> {
  dbReady = await connectDb();

  app.listen(PORT, () => {
    console.log("----------------------------------");
    console.log("       SCANWICK API SERVER        ");
    console.log("----------------------------------");
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`MongoDB: ${dbReady ? "Connected" : "Disconnected"}`);
    console.log("----------------------------------");
  });
}

start();
