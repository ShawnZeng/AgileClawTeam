"use client";

import type { Sprint } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const PHASES: { key: Sprint["status"]; labelKey: string; color: string }[] = [
  { key: "planning", labelKey: "phase.planning", color: "bg-purple-500" },
  { key: "execution", labelKey: "phase.executing", color: "bg-blue-500" },
  { key: "review", labelKey: "phase.reviewing", color: "bg-yellow-500" },
  { key: "retrospective", labelKey: "phase.retrospective", color: "bg-orange-500" },
  { key: "done", labelKey: "phase.complete", color: "bg-green-500" },
];

export default function SprintPhaseBar({ sprint }: { sprint: Sprint | null }) {
  const { t } = useI18n();
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
                {t(phase.labelKey)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
