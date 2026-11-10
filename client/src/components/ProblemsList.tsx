import type { Problem } from "../types";
import { formatMs } from "../rating";

export default function ProblemsList({ problems }: { problems: Problem[] }) {
  if (problems.length === 0) {
    return (
      <p className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
        No major performance problems found. Nice work!
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {problems.map((problem, index) => (
        <li
          key={problem.id}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="font-medium text-slate-900">
              {index + 1}. {problem.title}
            </h3>
            <div className="flex gap-2">
              {problem.savingsMs > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  Save {formatMs(problem.savingsMs)}
                </span>
              )}
              {problem.savingsKb > 0 && (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
                  Save {problem.savingsKb.toLocaleString()} KB
                </span>
              )}
            </div>
          </div>
          {problem.description && (
            <p className="mt-2 text-sm text-slate-500">{problem.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
