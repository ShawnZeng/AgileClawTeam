"use client";

import { useState } from "react";
import type { BacklogItem, Task } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const STATUS_COLUMNS: {
  key: BacklogItem["status"];
  labelKey: string;
  color: string;
}[] = [
  {
    key: "pending",
    labelKey: "status.notStartedShort",
    color: "text-gray-400",
  },
  { key: "in-progress", labelKey: "status.inProgress", color: "text-blue-400" },
  { key: "done", labelKey: "status.done", color: "text-green-400" },
];

const PRIORITY_COLORS = [
  "bg-red-900 text-red-300",
  "bg-orange-900 text-orange-300",
  "bg-yellow-900 text-yellow-300",
  "bg-gray-800 text-gray-400",
];

function ItemCard({ item, tasks }: { item: BacklogItem; tasks: Task[] }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const linkedTasks = tasks.filter((tk) => item.taskIds.includes(tk.id));
  const doneTasks = linkedTasks.filter((tk) => tk.status === "done").length;
  const priorityColor =
    PRIORITY_COLORS[Math.min(item.priority - 1, PRIORITY_COLORS.length - 1)] ??
    PRIORITY_COLORS[PRIORITY_COLORS.length - 1];

  return (
    <div
      className="bg-gray-800 border border-gray-700 rounded-lg p-3 cursor-pointer hover:border-gray-500 transition-colors"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-start gap-2">
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-mono ${priorityColor} shrink-0`}
        >
          P{item.priority}
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-200 truncate">
            {item.title}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 font-mono">
            {item.id}
          </div>
        </div>
      </div>
      {linkedTasks.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Tasks: {doneTasks}/{linkedTasks.length}
          <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: `${linkedTasks.length > 0 ? (doneTasks / linkedTasks.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}
      {expanded && (
        <div className="mt-2 border-t border-gray-700 pt-2 space-y-2">
          {item.description && (
            <p className="text-xs text-gray-400">{item.description}</p>
          )}
          {item.acceptanceCriteria.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {t("backlog.acceptance")}
              </div>
              <ul className="space-y-0.5">
                {item.acceptanceCriteria.map((c, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-1">
                    <span className="text-gray-600">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function BacklogBoard({
  backlog,
  tasks,
}: {
  backlog: BacklogItem[];
  tasks: Task[];
}) {
  const { t } = useI18n();
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Product Backlog
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {STATUS_COLUMNS.map((col) => {
          const items = backlog
            .filter((item) => item.status === col.key)
            .sort((a, b) => a.priority - b.priority);
          return (
            <div key={col.key}>
              <div className={`text-xs font-medium mb-2 ${col.color}`}>
                {t(col.labelKey)}{" "}
                <span className="text-gray-600">({items.length})</span>
              </div>
              <div className="space-y-2">
                {items.map((item) => (
                  <ItemCard key={item.id} item={item} tasks={tasks} />
                ))}
                {items.length === 0 && (
                  <div className="text-xs text-gray-700 text-center py-4 border border-dashed border-gray-800 rounded-lg">
                    {t("backlog.empty")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
