// Represents a performance problem identified during a Lighthouse audit
export type Problem = {
  id: string;
  title: string;
  description: string;
  savingsMs: number;
  savingsKb: number;
};
// Represents the result of a Lighthouse audit for a given URL  
export type AuditResult = {
  url: string;
  score: number;
  lcp: string;
  cls: string;
  pageWeightMb: number | null;
  requests: number | null;
  problems: Problem[];
};
