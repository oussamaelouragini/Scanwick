export type Strategy = "mobile" | "desktop";

export type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};

export type SeoStatus = "pass" | "warn" | "fail";

export type SeoCheck = {
  id: string;
  label: string;
  status: SeoStatus;
  detail: string;
};

export type SeoReport = {
  checks: SeoCheck[];
  passed: number;
  total: number;
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
  seo?: SeoReport | null;
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
