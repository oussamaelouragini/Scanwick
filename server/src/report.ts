import { chromium } from "playwright";

// Builds a self-contained HTML report and prints it to PDF with Playwright.
//
// Safety:
// - every value coming from the browser is escaped before it goes in the HTML
// - the PDF page runs with JavaScript off and with all network requests blocked
// - images are accepted only as JPEG data URLs

function esc(value: unknown, max = 500): string {
  return String(value ?? "")
    .slice(0, max)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const GREEN = "#16a34a";
const AMBER = "#d97706";
const RED = "#dc2626";
const INK = "#0f172a";

function scoreColor(score: number): string {
  if (score >= 90) return GREEN;
  if (score >= 50) return AMBER;
  return RED;
}

function lcpColor(lcp: string): string {
  const seconds = parseFloat(String(lcp).replace(",", "."));
  if (Number.isNaN(seconds)) return INK;
  if (seconds <= 2.5) return GREEN;
  if (seconds <= 4) return AMBER;
  return RED;
}

function clsColor(cls: string): string {
  const value = parseFloat(String(cls).replace(",", "."));
  if (Number.isNaN(value)) return INK;
  if (value <= 0.1) return GREEN;
  if (value <= 0.25) return AMBER;
  return RED;
}

function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`;
}

const CSS = `
@page { size: A4; margin: 14mm; }
* { box-sizing: border-box; }
body { font-family: Arial, Helvetica, sans-serif; color: ${INK}; font-size: 11px; line-height: 1.45; margin: 0; }
h1 { font-size: 22px; margin: 0 0 2px; }
h2 { font-size: 15px; margin: 22px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
h3 { font-size: 12px; margin: 0; }
p { margin: 0; }
.muted { color: #64748b; }
.url { word-break: break-all; }
.cards { display: flex; flex-wrap: wrap; gap: 8px; }
.card { flex: 1 1 30%; min-width: 120px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; }
.card .label { color: #64748b; font-size: 10px; }
.card .value { font-size: 20px; font-weight: 700; margin-top: 2px; }
.item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; break-inside: avoid; }
.row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.badge { display: inline-block; border-radius: 999px; padding: 1px 7px; font-size: 9.5px; font-weight: 700; background: #e2e8f0; color: #334155; white-space: nowrap; margin-left: 4px; }
.badge.high { background: #fee2e2; color: #b91c1c; }
.badge.medium { background: #fef3c7; color: #b45309; }
.badge.blue { background: #dbeafe; color: #1d4ed8; }
.check { display: flex; gap: 8px; align-items: flex-start; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; margin-bottom: 5px; break-inside: avoid; }
.dot { flex: 0 0 18px; width: 18px; height: 18px; border-radius: 50%; text-align: center; line-height: 18px; font-weight: 700; font-size: 11px; color: #fff; }
.shots { display: flex; gap: 8px; align-items: flex-start; }
.shot { flex: 1; break-inside: avoid; }
.shot img { width: 100%; border: 1px solid #e2e8f0; display: block; margin-top: 4px; }
.warn-text { color: ${RED}; font-size: 10px; margin-top: 3px; }
ol { margin: 6px 0 0; padding-left: 18px; }
pre { background: ${INK}; color: #f1f5f9; padding: 8px; border-radius: 6px; white-space: pre-wrap; word-break: break-word; font-size: 9.5px; margin: 8px 0 0; }
.evidence { margin-top: 6px; }
.evidence .badge { background: #eff6ff; color: #1d4ed8; font-weight: 400; margin: 0 4px 3px 0; }
.footer { margin-top: 24px; padding-top: 8px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 9.5px; text-align: center; }
`;

function card(label: string, value: string, color = INK): string {
  return `<div class="card"><div class="label">${esc(label)}</div><div class="value" style="color:${color}">${esc(value)}</div></div>`;
}

export function buildReportHtml(input: any): string | null {
  const audit = input?.audit;
  if (
    !audit ||
    typeof audit.score !== "number" ||
    typeof audit.url !== "string"
  )
    return null;

  const strategy = audit.strategy === "desktop" ? "Desktop" : "Mobile";
  const date = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const lcp = String(audit.lcp ?? "n/a");
  const cls = String(audit.cls ?? "n/a");

  let body = `
<h1>Website audit report</h1>
<p class="muted url">${esc(audit.url, 300)}</p>
<p class="muted">${strategy} test · ${esc(date)}</p>

<h2>Key results</h2>
<div class="cards">
  ${card("Performance score", `${Math.round(audit.score)} / 100`, scoreColor(audit.score))}
  ${card("LCP (loading)", lcp, lcpColor(lcp))}
  ${card("CLS (stability)", cls, clsColor(cls))}
</div>
<div class="cards" style="margin-top:8px">
  ${card("Page weight", typeof audit.pageWeightMb === "number" ? `${audit.pageWeightMb} MB` : "n/a")}
  ${card("Network requests", typeof audit.requests === "number" ? String(audit.requests) : "n/a")}
</div>`;

  // Client summary (only if the AI wrote one)
  if (typeof input?.summary === "string" && input.summary.trim()) {
    body += `
<h2>Summary</h2>
<p>${esc(input.summary.trim(), 3000).replace(/\n/g, "<br>")}</p>`;
  }

  // Top problems
  const problems = Array.isArray(audit.problems)
    ? audit.problems.slice(0, 8)
    : [];
  if (problems.length > 0) {
    body += "<h2>Top problems to fix</h2>";
    problems.forEach((p: any, index: number) => {
      const badges =
        (p?.savingsMs > 0
          ? `<span class="badge blue">Save ${esc(formatMs(p.savingsMs))}</span>`
          : "") +
        (p?.savingsKb > 0
          ? `<span class="badge blue">Save ${esc(Math.round(p.savingsKb))} KB</span>`
          : "");
      body += `
<div class="item">
  <div class="row"><h3>${index + 1}. ${esc(p?.title, 120)}</h3><div>${badges}</div></div>
  ${p?.description ? `<p class="muted" style="margin-top:3px">${esc(p.description, 400)}</p>` : ""}
</div>`;
    });
  }

  // SEO checks
  const checks = Array.isArray(input?.seo?.checks)
    ? input.seo.checks.slice(0, 12)
    : [];
  if (checks.length > 0) {
    const colors: Record<string, string> = {
      pass: GREEN,
      warn: AMBER,
      fail: RED,
    };
    const icons: Record<string, string> = { pass: "✓", warn: "!", fail: "✕" };
    body += `<h2>SEO checks (${esc(input.seo.passed)} of ${esc(input.seo.total)} passed)</h2>`;
    checks.forEach((c: any) => {
      const status = ["pass", "warn", "fail"].includes(c?.status)
        ? c.status
        : "warn";
      body += `
<div class="check">
  <div class="dot" style="background:${colors[status]}">${icons[status]}</div>
  <div><h3>${esc(c?.label, 80)}</h3><p class="muted">${esc(c?.detail, 300)}</p></div>
</div>`;
    });
  }

  // Screenshots
  const shots = Array.isArray(input?.shots) ? input.shots.slice(0, 3) : [];
  const shotsWithImage = shots.filter(
    (s: any) =>
      typeof s?.image === "string" &&
      /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s.image),
  );
  if (shotsWithImage.length > 0) {
    body += '<h2>Responsive preview</h2><div class="shots">';
    shotsWithImage.forEach((s: any) => {
      const overflow =
        s.overflowing && typeof s.pageWidth === "number"
          ? `<p class="warn-text">Horizontal scroll: content is ${esc(s.pageWidth)} px wide on a ${esc(s.width)} px screen.</p>`
          : "";
      body += `
<div class="shot">
  <h3>${esc(s?.label, 30)} <span class="muted">· ${esc(s?.width)} px</span></h3>
  ${overflow}
  <img src="${s.image}" alt="" />
</div>`;
    });
    body += "</div>";
  }

  // AI recommendations (only if the AI wrote them)
  const recommendations = Array.isArray(input?.recommendations)
    ? input.recommendations.slice(0, 6)
    : [];
  if (recommendations.length > 0) {
    body += "<h2>Recommended fixes</h2>";
    recommendations.forEach((r: any, index: number) => {
      const priority = ["high", "medium", "low"].includes(r?.priority)
        ? r.priority
        : "medium";
      const steps = (Array.isArray(r?.steps) ? r.steps.slice(0, 5) : [])
        .map((step: unknown) => `<li>${esc(step, 300)}</li>`)
        .join("");
      const evidence = (
        Array.isArray(r?.evidence) ? r.evidence.slice(0, 3) : []
      )
        .map(
          (e: any) =>
            `<span class="badge">${esc(e?.key, 60)}: ${esc(e?.value, 200)}</span>`,
        )
        .join("");
      body += `
<div class="item">
  <div class="row"><h3>${index + 1}. ${esc(r?.title, 120)}</h3><span class="badge ${priority}">${priority} priority</span></div>
  <p style="margin-top:3px">${esc(r?.why, 500)}</p>
  ${steps ? `<ol>${steps}</ol>` : ""}
  ${typeof r?.code === "string" && r.code.trim() ? `<pre>${esc(r.code.trim(), 1500)}</pre>` : ""}
  ${evidence ? `<div class="evidence">${evidence}</div>` : ""}
</div>`;
    });
  }

  body += '<div class="footer">Generated by Scanwick</div>';

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>Scanwick report</title><style>${CSS}</style></head>
<body>${body}</body>
</html>`;
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch();

  try {
    // JavaScript off: nothing inside the report can run code
    const context = await browser.newContext({ javaScriptEnabled: false });
    // The report is self-contained: block every request to the internet
    await context.route(/^https?:/, (route) => route.abort());

    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });

    return await page.pdf({ format: "A4", printBackground: true });
  } finally {
    await browser.close();
  }
}
