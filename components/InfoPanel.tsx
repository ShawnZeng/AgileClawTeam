"use client";

import { useState } from "react";
import type { BacklogItem, Task, Sprint, AgentState } from "@/lib/types";
import { useDisplayNames } from "@/lib/useDisplayNames";
import { formatAgentLabel } from "@/lib/agentDisplay";
import { AgentAvatar } from "@/components/AgentAvatar";
import { ArtifactList } from "@/components/ArtifactList";

// ── Sprint block ──────────────────────────────────────────────────────────────

const PHASE_LABELS: Record<string, string> = {
  planning: "计划中",
  execution: "执行中",
  review: "评审中",
  retrospective: "回顾中",
  done: "已完成",
};
const PHASE_COLORS: Record<string, string> = {
  planning: "bg-purple-800 text-purple-300",
  execution: "bg-blue-800 text-blue-300",
  review: "bg-yellow-800 text-yellow-300",
  retrospective: "bg-orange-800 text-orange-300",
  done: "bg-green-800 text-green-300",
};

function SprintBlock({ sprint }: { sprint: Sprint | null }) {
  if (!sprint?.id) {
    return (
      <div className="text-xs text-gray-600 text-center py-3 border border-dashed border-gray-800 rounded-lg">
        暂无进行中的 Sprint
      </div>
    );
  }
  const phaseLabel = PHASE_LABELS[sprint.status ?? ""] ?? sprint.status;
  const phaseColor =
    PHASE_COLORS[sprint.status ?? ""] ?? "bg-gray-800 text-gray-400";
  return (
    <div className="bg-gray-800 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-300">
          Sprint {sprint.number ?? "—"}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${phaseColor}`}
        >
          {phaseLabel}
        </span>
      </div>
      {sprint.goal && (
        <p className="text-xs text-gray-500 mt-1 truncate" title={sprint.goal}>
          {sprint.goal}
        </p>
      )}
      <div className="text-xs text-gray-600 mt-1">
        已承诺 {sprint.committedItemIds?.length ?? 0} 个需求
      </div>
    </div>
  );
}

// ── Priority operation ────────────────────────────────────────────────────────

const PRIORITY_COLOR = [
  "bg-red-900 text-red-300 border-red-800",
  "bg-orange-900 text-orange-300 border-orange-800",
  "bg-yellow-900 text-yellow-300 border-yellow-800",
  "bg-gray-800 text-gray-400 border-gray-700",
];

const STATUS_LABEL: Record<BacklogItem["status"], string> = {
  pending: "待开始",
  "in-progress": "进行中",
  done: "已完成",
};
const STATUS_COLOR: Record<BacklogItem["status"], string> = {
  pending: "text-gray-500",
  "in-progress": "text-blue-400",
  done: "text-green-400",
};

interface BacklogCardProps {
  item: BacklogItem;
  tasks: Task[];
  agents: AgentState[];
  displayNames: Record<string, string>;
  sprintCommittedIds: string[];
  onMoveToSprint: () => void;
  onPriorityChange: (delta: -1 | 1) => void;
  loading: boolean;
}

function BacklogCard({
  item,
  tasks,
  agents,
  displayNames,
  sprintCommittedIds,
  onMoveToSprint,
  onPriorityChange,
  loading,
}: BacklogCardProps) {
  const [expanded, setExpanded] = useState(false);
  const linkedTasks = tasks.filter((t) => item.taskIds.includes(t.id));
  const doneTasks = linkedTasks.filter((t) => t.status === "done").length;
  const priorityColorClass =
    PRIORITY_COLOR[Math.min(item.priority - 1, PRIORITY_COLOR.length - 1)] ??
    PRIORITY_COLOR[PRIORITY_COLOR.length - 1];
  const inSprint = sprintCommittedIds.includes(item.id);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
      {/* Card header — click to expand */}
      <div
        className="px-3 py-2.5 cursor-pointer hover:bg-gray-750 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-2">
          <span
            className={`text-xs px-1.5 py-0.5 rounded border font-mono shrink-0 mt-0.5 ${priorityColorClass}`}
          >
            P{item.priority}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 leading-snug">
              {item.title}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs ${STATUS_COLOR[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>
              {linkedTasks.length > 0 && (
                <span className="text-xs text-gray-600">
                  {doneTasks}/{linkedTasks.length} 任务
                </span>
              )}
            </div>
          </div>
          <span className="text-gray-600 text-xs shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Operations bar */}
      <div className="px-3 py-1.5 border-t border-gray-700/60 flex items-center gap-2 bg-gray-900/40">
        <button
          onClick={onMoveToSprint}
          disabled={inSprint || loading}
          className="text-xs px-2 py-1 rounded bg-blue-800/60 text-blue-300 hover:bg-blue-700/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {inSprint ? "已在 Sprint" : "移入 Sprint"}
        </button>
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-gray-600">优先级</span>
          <button
            onClick={() => onPriorityChange(-1)}
            disabled={item.priority <= 1 || loading}
            className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-300 text-xs flex items-center justify-center transition-colors"
          >
            ↑
          </button>
          <button
            onClick={() => onPriorityChange(1)}
            disabled={item.priority >= 10 || loading}
            className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-gray-300 text-xs flex items-center justify-center transition-colors"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3 pb-3 pt-2 border-t border-gray-700/60 space-y-2">
          <p className="text-xs text-gray-500 font-mono">{item.id}</p>
          {item.description && (
            <p className="text-xs text-gray-400 leading-relaxed">
              {item.description}
            </p>
          )}
          {item.acceptanceCriteria.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">验收标准</div>
              <ul className="space-y-0.5">
                {item.acceptanceCriteria.map((c, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-1.5">
                    <span className="text-gray-600 shrink-0">•</span>
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {linkedTasks.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-1">关联任务</div>
              {linkedTasks.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 text-xs text-gray-500 py-0.5"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      t.status === "done"
                        ? "bg-green-500"
                        : t.status === "in-progress"
                          ? "bg-blue-500"
                          : t.status === "blocked"
                            ? "bg-red-500"
                            : "bg-gray-600"
                    }`}
                  />
                  <span className="truncate">{t.title}</span>
                  <span className="shrink-0 text-gray-700">
                    {t.assigneeId
                      ? formatAgentLabel(
                          t.assigneeId,
                          agents.find((a) => a.id === t.assigneeId)?.role ??
                            t.assigneeId,
                          displayNames,
                        )
                      : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {item.status === "done" && (() => {
            const allArtifacts = linkedTasks.flatMap((t) => t.artifacts ?? []);
            if (allArtifacts.length === 0) return null;
            return (
              <div className="pt-2 border-t border-emerald-900/30">
                <div className="text-xs text-emerald-700 mb-1.5 font-medium">
                  🏆 成果物（{allArtifacts.length} 项）
                </div>
                <ArtifactList artifacts={allArtifacts} />
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Agent status block ────────────────────────────────────────────────────────

const STATUS_DOT: Record<AgentState["status"], string> = {
  idle: "bg-gray-500",
  working: "bg-blue-400 animate-pulse",
  blocked: "bg-red-400 animate-pulse",
  waiting: "bg-yellow-400",
  offline: "bg-gray-700",
};

function AgentBlock({
  agents,
  displayNames,
}: {
  agents: AgentState[];
  displayNames: Record<string, string>;
}) {
  if (agents.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {agents.map((a) => (
        <div
          key={a.id}
          className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5"
          title={a.currentTaskId ? `任务: ${a.currentTaskId}` : a.status}
        >
          <AgentAvatar agentId={a.id} role={a.role} size={18} />
          <span className="text-xs text-gray-300">
            {formatAgentLabel(a.id, a.role, displayNames)}
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[a.status]}`}
          />
        </div>
      ))}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface InfoPanelProps {
  backlog: BacklogItem[];
  tasks: Task[];
  sprint: Sprint | null;
  agents: AgentState[];
  onDataChange?: () => void;
}

export default function InfoPanel({
  backlog,
  tasks,
  sprint,
  agents,
  onDataChange,
}: InfoPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const displayNames = useDisplayNames();

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

  const sortedBacklog = [...backlog].sort((a, b) => a.priority - b.priority);
  const sprintCommittedIds = sprint?.committedItemIds ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden space-y-3">
      {/* Backlog */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-0.5 shrink-0">
          待办事项列表
          <span className="ml-1 text-gray-700 font-normal">
            ({backlog.length})
          </span>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {sortedBacklog.length === 0 ? (
            <div className="text-xs text-gray-700 text-center py-6 border border-dashed border-gray-800 rounded-lg">
              暂无待办事项，与 PO 对话来创建
            </div>
          ) : (
            sortedBacklog.map((item) => (
              <BacklogCard
                key={item.id}
                item={item}
                tasks={tasks}
                agents={agents}
                displayNames={displayNames}
                sprintCommittedIds={sprintCommittedIds}
                onMoveToSprint={() => void handleMoveToSprint(item.id)}
                onPriorityChange={(delta) =>
                  void handlePriorityChange(item.id, delta)
                }
                loading={loadingId === item.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Sprint */}
      <div className="shrink-0">
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
          Sprint 状态
        </div>
        <SprintBlock sprint={sprint} />
      </div>

      {/* Agents */}
      {agents.length > 0 && (
        <div className="shrink-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 px-0.5">
            Agent 状态
          </div>
          <AgentBlock agents={agents} displayNames={displayNames} />
        </div>
      )}
    </div>
  );
}
