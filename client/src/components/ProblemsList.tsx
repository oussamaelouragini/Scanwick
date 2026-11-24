import type { Problem } from "../types";
import { formatMs } from "../rating";

export default function ProblemsList({ problems }: { problems: Problem[] }) {
  if (problems.length === 0) {
    return (
      <p className="rounded-md border border-success-container bg-success-container/25 p-gutter-lg font-body text-body-md text-on-success-container">
        No major performance problems found. Nice work!
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-gutter-sm">
      {problems.map((problem, index) => (
        <li
          key={problem.id}
          className="rounded-md border border-outline-variant/70 bg-surface-container-lowest p-gutter-lg shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-gutter-sm">
            <h3 className="font-title text-title-md text-on-surface">
              {index + 1}. {problem.title}
            </h3>
            <div className="flex flex-wrap items-center gap-gutter-xs">
              {problem.savingsMs > 0 && (
                <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 font-mono text-mono-sm text-primary">
                  Save {formatMs(problem.savingsMs)}
                </span>
              )}
              {problem.savingsKb > 0 && (
                <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 font-mono text-mono-sm text-secondary">
                  Save {problem.savingsKb.toLocaleString()} KB
                </span>
              )}
            </div>
          </div>
          {problem.description && (
            <p className="mt-gutter-sm text-pretty font-body text-body-md text-on-surface-variant">
              {problem.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
