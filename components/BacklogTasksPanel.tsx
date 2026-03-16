"use client";

import { useState } from "react";
import type { BacklogItem, Task, Sprint, AgentState } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const SPRINT_STATUS_BADGE: Record<string, string> = {
  planning: "bg-violet-800/60 text-violet-300",
  execution: "bg-blue-800/60 text-blue-300",
  review: "bg-yellow-800/60 text-yellow-300",
  retrospective: "bg-orange-800/60 text-orange-300",
  done: "bg-green-800/60 text-green-300",
};
const SPRINT_STATUS_LABEL: Record<string, string> = {
  planning: "计划中",
  execution: "执行中",
  review: "评审中",
  retrospective: "回顾中",
  done: "已完成",
};

const TASK_TYPE_ICON: Record<Task["type"], string> = {
  development: "⚙️",
  design: "🎨",
  testing: "🧪",
  other: "📌",
};

const TASK_STATUS_BADGE: Record<Task["status"], string> = {
  pending: "bg-gray-800 text-gray-500",
  "in-progress": "bg-blue-800/70 text-blue-300",
  done: "bg-green-800/60 text-green-300",
  blocked: "bg-red-800/60 text-red-300",
};
const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  pending: "待开始",
  "in-progress": "进行中",
  done: "完成",
  blocked: "阻塞",
};

const ITEM_PRIORITY_COLORS = [
  "bg-red-900/60 text-red-300 border-red-800/60",
  "bg-orange-900/60 text-orange-300 border-orange-800/60",
  "bg-yellow-900/60 text-yellow-300 border-yellow-800/60",
  "bg-gray-800 text-gray-500 border-gray-700",
];
const ITEM_STATUS_LABEL: Record<BacklogItem["status"], string> = {
  pending: "待办",
  "in-progress": "进行中",
  done: "完成",
};
const ITEM_STATUS_COLOR: Record<BacklogItem["status"], string> = {
  pending: "text-gray-500",
  "in-progress": "text-blue-400",
  done: "text-green-400",
};

const ROLE_EMOJI: Record<string, string> = {
  po: "🙎",
  sm: "🧑‍💼",
  developer: "👨‍💻",
  designer: "🎨",
  tester: "🧪",
};

// ── Task row ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  taskMap,
  agents,
  isLast,
}: {
  task: Task;
  taskMap: Map<string, Task>;
  agents: AgentState[];
  isLast: boolean;
}) {
  const assignee = agents.find((a) => a.id === task.assigneeId);
  const deps = task.dependencies
    .map((id) => taskMap.get(id))
    .filter(Boolean) as Task[];
  const blockedByDep = deps.some((d) => d.status !== "done");
  const effectiveStatus =
    task.status === "pending" && blockedByDep ? "waiting" : task.status;
  const statusBadge = TASK_STATUS_BADGE[task.status];
  const statusLabel = TASK_STATUS_LABEL[task.status];

  return (
    <div className="flex items-start gap-2 group">
      {/* Tree line */}
      <div
        className="flex flex-col items-center shrink-0 mt-1"
        style={{ width: 16 }}
      >
        <div className="w-px bg-gray-700 flex-1" style={{ minHeight: 8 }} />
        <div className={`w-2 h-px bg-gray-700 ${isLast ? "" : ""}`} />
      </div>

      <div className="flex-1 min-w-0 pb-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          {/* Type icon */}
          <span className="text-xs shrink-0 mt-0.5" title={task.type}>
            {TASK_TYPE_ICON[task.type]}
          </span>

          {/* Task id + title */}
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-600 font-mono mr-1">
              {task.id}
            </span>
            <span className="text-xs text-gray-300">{task.title}</span>
          </div>

          {/* Assignee chip */}
          {assignee ? (
            <div className="flex items-center gap-1 shrink-0 bg-gray-800 rounded px-1.5 py-0.5">
              <span className="text-[10px]">
                {ROLE_EMOJI[assignee.role] ?? "🤖"}
              </span>
              <span className="text-[10px] text-gray-400">{assignee.id}</span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-700 shrink-0">未分配</span>
          )}

          {/* Status badge */}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${statusBadge}`}
          >
            {effectiveStatus === "waiting" ? "等待依赖" : statusLabel}
          </span>
        </div>

        {/* Dependencies notice */}
        {deps.length > 0 && blockedByDep && (
          <div className="text-[10px] text-yellow-700 mt-0.5 pl-5">
            ↳ 等待:{" "}
            {deps
              .filter((d) => d.status !== "done")
              .map((d) => d.id)
              .join(", ")}
          </div>
        )}

        {/* Blocked reason */}
        {task.status === "blocked" && task.blockerDescription && (
          <div className="text-[10px] text-red-500 mt-0.5 pl-5 truncate">
            ⛔ {task.blockerDescription}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Backlog item row ───────────────────────────────────────────────────────────

function BacklogItemRow({
  item,
  tasks,
  taskMap,
  agents,
  inSprint,
  onMoveToSprint,
  loadingId,
  onPriorityChange,
}: {
  item: BacklogItem;
  tasks: Task[];
  taskMap: Map<string, Task>;
  agents: AgentState[];
  inSprint: boolean;
  onMoveToSprint: () => void;
  loadingId: string | null;
  onPriorityChange: (itemId: string, delta: -1 | 1) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const itemTasks = tasks.filter((t) => t.itemId === item.id);
  const doneTasks = itemTasks.filter((t) => t.status === "done").length;
  const priorIdx = Math.min(item.priority - 1, ITEM_PRIORITY_COLORS.length - 1);
  const priorColor =
    ITEM_PRIORITY_COLORS[priorIdx] ??
    ITEM_PRIORITY_COLORS[ITEM_PRIORITY_COLORS.length - 1];
  const loading = loadingId === item.id;

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      {/* Header row */}
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border font-mono shrink-0 ${priorColor}`}
        >
          P{item.priority}
        </span>
        <span className="text-xs font-medium text-gray-200 flex-1 truncate">
          {item.title}
        </span>
        {itemTasks.length > 0 && (
          <span className="text-[10px] text-gray-600 shrink-0">
            {doneTasks}/{itemTasks.length} 任务
          </span>
        )}
        <span
          className={`text-[10px] shrink-0 ${ITEM_STATUS_COLOR[item.status]}`}
        >
          {ITEM_STATUS_LABEL[item.status]}
        </span>
        <span className="text-gray-700 text-[10px] shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Task list */}
      {expanded && itemTasks.length > 0 && (
        <div className="px-3 pb-2 pt-1 border-t border-gray-800/60 bg-gray-900/40">
          {itemTasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              taskMap={taskMap}
              agents={agents}
              isLast={i === itemTasks.length - 1}
            />
          ))}
        </div>
      )}

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-t border-gray-800/40 bg-gray-900/30">
        <span className="text-[10px] font-mono text-gray-700">{item.id}</span>
        <button
          onClick={onMoveToSprint}
          disabled={inSprint || loading}
          className="text-[10px] px-2 py-0.5 rounded bg-blue-900/50 text-blue-400 hover:bg-blue-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {inSprint ? "已在 Sprint" : "移入 Sprint"}
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => onPriorityChange(item.id, -1)}
            disabled={item.priority <= 1 || loading}
            className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] flex items-center justify-center disabled:opacity-30 transition-colors"
            title="提高优先级"
          >
            ↑
          </button>
          <button
            onClick={() => onPriorityChange(item.id, 1)}
            disabled={item.priority >= 10 || loading}
            className="w-5 h-5 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] flex items-center justify-center disabled:opacity-30 transition-colors"
            title="降低优先级"
          >
            ↓
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sprint header ──────────────────────────────────────────────────────────────

function SprintHeader({ sprint }: { sprint: Sprint }) {
  const badge =
    SPRINT_STATUS_BADGE[sprint.status] ?? "bg-gray-800 text-gray-400";
  const label = SPRINT_STATUS_LABEL[sprint.status] ?? sprint.status;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-800/60 border-b border-gray-700/60 shrink-0">
      <span className="text-xs font-bold text-gray-300">
        🏃 Sprint {sprint.number}
      </span>
      <span
        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${badge}`}
      >
        {label}
      </span>
      {sprint.goal && (
        <span
          className="text-xs text-gray-500 truncate flex-1"
          title={sprint.goal}
        >
          {sprint.goal}
        </span>
      )}
      {sprint.startedAt && (
        <span className="text-[10px] text-gray-700 shrink-0">
          {new Date(sprint.startedAt).toLocaleDateString("zh-CN")} 起
        </span>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

interface BacklogTasksPanelProps {
  backlog: BacklogItem[];
  tasks: Task[];
  sprint: Sprint | null;
  agents: AgentState[];
  onDataChange?: () => void;
}

export default function BacklogTasksPanel({
  backlog,
  tasks,
  sprint,
  agents,
  onDataChange,
}: BacklogTasksPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const committedIds = sprint?.committedItemIds ?? [];
  const sortedBacklog = [...backlog].sort((a, b) => a.priority - b.priority);
  const sprintItems = sortedBacklog.filter((item) =>
    committedIds.includes(item.id),
  );
  const pendingItems = sortedBacklog.filter(
    (item) => !item.sprintId && item.status !== "done",
  );
  const doneItems = sortedBacklog.filter(
    (item) => item.status === "done" && !committedIds.includes(item.id),
  );

  const handleMoveToSprint = async (itemId: string) => {
    setLoadingId(itemId);
    try {
      await fetch("/api/sprint/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      onDataChange?.();
    } finally {
      setLoadingId(null);
    }
  };

  const handlePriorityChange = async (itemId: string, delta: -1 | 1) => {
    const item = backlog.find((b) => b.id === itemId);
    if (!item) return;
    const newPriority = Math.max(1, Math.min(10, item.priority + delta));
    setLoadingId(itemId);
    try {
      await fetch(`/api/backlog/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: newPriority }),
      });
      onDataChange?.();
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Sprint header */}
      {sprint && <SprintHeader sprint={sprint} />}

      <div className="flex-1 overflow-y-auto">
        {/* Sprint items */}
        {sprintItems.length > 0 && (
          <div className="p-4 space-y-2">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              📋 本次迭代待办事项 ({sprintItems.length})
            </div>
            {sprintItems.map((item) => (
              <BacklogItemRow
                key={item.id}
                item={item}
                tasks={tasks}
                taskMap={taskMap}
                agents={agents}
                inSprint={committedIds.includes(item.id)}
                onMoveToSprint={() => void handleMoveToSprint(item.id)}
                loadingId={loadingId}
                onPriorityChange={(id, d) => void handlePriorityChange(id, d)}
              />
            ))}
          </div>
        )}

        {/* Pending unplanned items */}
        {pendingItems.length > 0 && (
          <div className="px-4 pb-4 space-y-2">
            <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider mb-2">
              🗂 待规划 ({pendingItems.length})
            </div>
            {pendingItems.map((item) => (
              <BacklogItemRow
                key={item.id}
                item={item}
                tasks={tasks}
                taskMap={taskMap}
                agents={agents}
                inSprint={false}
                onMoveToSprint={() => void handleMoveToSprint(item.id)}
                loadingId={loadingId}
                onPriorityChange={(id, d) => void handlePriorityChange(id, d)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {sprintItems.length === 0 && pendingItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-gray-600">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-sm">暂无待办事项</div>
            <div className="text-xs mt-1 text-gray-700">
              点击「给PO派活」开始创建需求
            </div>
          </div>
        )}

        {/* Done items (collapsed by default) */}
        {doneItems.length > 0 && (
          <div className="px-4 pb-4">
            <details className="group">
              <summary className="text-[11px] text-gray-700 cursor-pointer hover:text-gray-500 select-none">
                ✅ 已完成 ({doneItems.length} 项)
              </summary>
              <div className="mt-2 space-y-1.5">
                {doneItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1 rounded opacity-50"
                  >
                    <span className="text-[10px] font-mono text-gray-700">
                      {item.id}
                    </span>
                    <span className="text-xs text-gray-600 truncate">
                      {item.title}
                    </span>
                    <span className="text-[10px] text-green-700 shrink-0">
                      完成
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
