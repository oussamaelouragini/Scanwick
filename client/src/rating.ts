export type Tone = "good" | "average" | "poor" | "neutral";

// Google's thresholds: https://web.dev/articles/vitals

export function scoreTone(score: number): Tone {
  if (score >= 90) return "good";
  if (score >= 50) return "average";
  return "poor";
}

// lcp looks like "1.8 s"
export function lcpTone(lcp: string): Tone {
  const seconds = parseFloat(lcp.replace(",", "."));
  if (Number.isNaN(seconds)) return "neutral";
  if (seconds <= 2.5) return "good";
  if (seconds <= 4) return "average";
  return "poor";
}

// cls looks like "0.05"
export function clsTone(cls: string): Tone {
  const value = parseFloat(cls.replace(",", "."));
  if (Number.isNaN(value)) return "neutral";
  if (value <= 0.1) return "good";
  if (value <= 0.25) return "average";
  return "poor";
}

export function formatMs(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`;
}
