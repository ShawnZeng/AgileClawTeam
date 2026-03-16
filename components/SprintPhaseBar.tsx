"use client";

import type { Sprint } from "@/lib/types";

const PHASES: { key: Sprint["status"]; label: string; color: string }[] = [
  { key: "planning", label: "计划", color: "bg-purple-500" },
  { key: "execution", label: "执行", color: "bg-blue-500" },
  { key: "review", label: "评审", color: "bg-yellow-500" },
  { key: "retrospective", label: "回顾", color: "bg-orange-500" },
  { key: "done", label: "完成", color: "bg-green-500" },
];

export default function SprintPhaseBar({ sprint }: { sprint: Sprint | null }) {
  const currentIdx = sprint?.status
    ? PHASES.findIndex((p) => p.key === sprint.status)
    : -1;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Sprint {sprint?.number ?? "—"}
        </h2>
        {sprint?.goal && (
          <span
            className="text-xs text-gray-500 truncate max-w-64"
            title={sprint.goal}
          >
            {sprint.goal}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {PHASES.map((phase, idx) => {
          const isCurrent = currentIdx === idx;
          const isDone = currentIdx > idx;
          return (
            <div key={phase.key} className="flex items-center flex-1">
              <div
                className={`flex-1 h-2 rounded-full transition-all ${
                  isDone
                    ? "bg-green-600"
                    : isCurrent
                      ? phase.color
                      : "bg-gray-700"
                }`}
              />
              {idx < PHASES.length - 1 && (
                <div
                  className={`w-1 h-1 rounded-full mx-0.5 ${
                    isDone ? "bg-green-600" : "bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1 mt-1">
        {PHASES.map((phase, idx) => {
          const isCurrent = currentIdx === idx;
          return (
            <div key={phase.key} className="flex-1 text-center">
              <span
                className={`text-xs ${
                  isCurrent ? "text-white font-semibold" : "text-gray-600"
                }`}
              >
                {phase.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
