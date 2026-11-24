import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDb } from "./db";
import { Audit } from "./models/Audit";
import { inspectPage } from "./inspect";
import {
  AiError,
  buildFacts,
  getClientSummary,
  getRecommendations,
} from "./ai";
import { buildReportHtml, renderPdf } from "./report";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.PSI_API_KEY;
let dbReady = false;

const allowedOrigins = (process.env.CLIENT_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
// The PDF report carries the screenshots, so this route accepts a bigger body.
// It must come before the general parser below.
app.use("/api/report", express.json({ limit: "8mb" }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.send("ok");
});

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
      lcp:
        (audits["largest-contentful-paint"]?.displayValue as
          | string
          | undefined) ?? "n/a",
      cls:
        (audits["cumulative-layout-shift"]?.displayValue as
          | string
          | undefined) ?? "n/a",
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
      res
        .status(504)
        .json({
          error: "The audit took too long. Try again or test another URL.",
        });
      return;
    }
    console.error(err);
    res.status(502).json({ error: "Could not reach the PageSpeed API." });
  }
});

// Open the page in a real browser: screenshots at 3 sizes + SEO checklist.
// Screenshots are not saved (too large), the SEO checklist is saved with the audit.
app.post("/api/inspect", async (req, res) => {
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
    const { shots, seo } = await inspectPage(parsed.href);

    const auditId = req.body?.auditId;
    if (
      dbReady &&
      seo &&
      typeof auditId === "string" &&
      mongoose.isValidObjectId(auditId)
    ) {
      try {
        await Audit.findByIdAndUpdate(auditId, { seo });
      } catch (err) {
        console.error("Could not save SEO checks:", err);
      }
    }

    res.json({ url: parsed.href, shots, seo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not inspect the page." });
  }
});

// --- PDF report ---

let reportsRunning = 0;

app.post("/api/report", async (req, res) => {
  const html = buildReportHtml(req.body);
  if (!html) {
    res.status(400).json({ error: "Missing audit data." });
    return;
  }
  if (reportsRunning >= 2) {
    res
      .status(429)
      .json({
        error: "Too many reports at the same time. Try again in a moment.",
      });
    return;
  }

  reportsRunning++;
  try {
    const pdf = await renderPdf(html);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="scanwick-report.pdf"',
    });
    res.send(pdf);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not create the PDF." });
  } finally {
    reportsRunning--;
  }
});

// --- AI (Groq) ---

// Simple protection for the API key: 10 AI requests per minute in total
const aiCalls: number[] = [];
function aiRateLimited(): boolean {
  const now = Date.now();
  while (aiCalls.length > 0 && now - aiCalls[0] > 60_000) aiCalls.shift();
  if (aiCalls.length >= 10) return true;
  aiCalls.push(now);
  return false;
}

function sendAiError(res: express.Response, err: unknown) {
  if (err instanceof AiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "The AI request failed." });
}

// Fix recommendations with evidence (and code snippets)
app.post("/api/ai/recommendations", async (req, res) => {
  const facts = buildFacts(req.body);
  if (!facts) {
    res.status(400).json({ error: "Missing audit data." });
    return;
  }
  if (aiRateLimited()) {
    res
      .status(429)
      .json({ error: "Too many AI requests. Wait a minute and try again." });
    return;
  }

  try {
    const recommendations = await getRecommendations(facts, req.body?.stack);
    res.json({ recommendations });
  } catch (err) {
    sendAiError(res, err);
  }
});

// Short report for a non-technical client, in English, French or Turkish
app.post("/api/ai/summary", async (req, res) => {
  const facts = buildFacts(req.body);
  if (!facts) {
    res.status(400).json({ error: "Missing audit data." });
    return;
  }
  if (aiRateLimited()) {
    res
      .status(429)
      .json({ error: "Too many AI requests. Wait a minute and try again." });
    return;
  }

  try {
    const summary = await getClientSummary(facts, req.body?.language);
    res.json({ summary });
  } catch (err) {
    sendAiError(res, err);
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
        seo: a.seo ?? null,
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Scanwick server running on http://0.0.0.0:${PORT}`);
  });
}

start();
