export type Strategy = "mobile" | "desktop";

export type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};

export type AuditResult = {
  id?: string; // present when the audit was saved in MongoDB
  createdAt?: string;
  url: string;
  strategy: Strategy;
  score: number;
  lcp: string;
  cls: string;
  pageWeightMb: number | null;
  requests: number | null;
  problems: Problem[];
};

export type ViewportShot = {
  label: string;
  width: number;
  height: number;
  image: string | null;
  overflowing: boolean;
  pageWidth: number | null;
  error?: string;
};
