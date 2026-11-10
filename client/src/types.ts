export type Strategy = "mobile" | "desktop";

export type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};

export type AuditResult = {
  url: string;
  strategy: Strategy;
  score: number;
  lcp: string;
  cls: string;
  pageWeightMb: number | null;
  requests: number | null;
  problems: Problem[];
};
