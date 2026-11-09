import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const API_KEY = process.env.PSI_API_KEY;

// Allow the Vite dev server (React) to call this API
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.post("/api/audit", async (req, res) => {
  const { url } = req.body ?? {};

  // 1. Validate the input
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

  // 2. Build the PageSpeed Insights request
  const endpoint = new URL(
    "https://www.googleapis.com/pagespeedonline/v5/runPagespeed",
  );
  endpoint.searchParams.set("url", parsed.href);
  endpoint.searchParams.set("strategy", "mobile");
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.set("key", API_KEY);

  try {
    // 3. Call Google (can take 10 to 30 seconds)
    const response = await fetch(endpoint);
    const data: any = await response.json();

    if (!response.ok) {
      res
        .status(response.status)
        .json({ error: data?.error?.message ?? "PageSpeed request failed." });
      return;
    }

    // 4. Return only what we need
    const lighthouse = data.lighthouseResult;
    res.json({
      url: parsed.href,
      score: Math.round(lighthouse.categories.performance.score * 100),
      lcp: lighthouse.audits["largest-contentful-paint"].displayValue,
      cls: lighthouse.audits["cumulative-layout-shift"].displayValue,
    });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Could not reach the PageSpeed API." });
  }
});

app.listen(PORT, () => {
  console.log(`Scanwick server running on http://localhost:${PORT}`);
});
