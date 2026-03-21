"use client";

import { useState, useEffect } from "react";
import type {
  BacklogItem,
  Task,
  Sprint,
  AgentState,
  AgentMessage,
} from "@/lib/types";
import { useDisplayNames } from "@/lib/useDisplayNames";
import { ROLE_ABBR } from "@/lib/agentDisplay";
import { ArtifactList } from "@/components/ArtifactList";

// ── Constants ──────────────────────────────────────────────────────────────────

type TaskHistoryEntry = { status: string; timestamp: string };
type TaskHistoryMap = Record<string, TaskHistoryEntry[]>;

const HISTORY_STATUS_LABEL: Record<string, string> = {
  pending: "创建",
  "in-progress": "进行",
  done: "✓完成",
  blocked: "阻塞",
};

function fmtHistoryTs(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

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

// "working" is written by SM/agents as an alias for "in-progress"
const TASK_STATUS_BADGE: Record<Task["status"], string> = {
  pending: "bg-gray-800 text-gray-500",
  "in-progress": "bg-blue-800/70 text-blue-300",
  working: "bg-blue-800/70 text-blue-300",
  done: "bg-green-800/60 text-green-300",
  blocked: "bg-red-800/60 text-red-300",
};
const TASK_STATUS_LABEL: Record<Task["status"], string> = {
  pending: "待开始",
  "in-progress": "进行中",
  working: "进行中",
  done: "完成",
  blocked: "阻塞",
};

const ITEM_PRIORITY_COLORS = [
  "bg-red-900/60 text-red-300 border-red-800/60",
  "bg-orange-900/60 text-orange-300 border-orange-800/60",
  "bg-yellow-900/60 text-yellow-300 border-yellow-800/60",
  "bg-gray-800 text-gray-500 border-gray-700",
];

// ── Task row ───────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  taskMap,
  agents,
  isLast,
  onViewWorkLog,
  history,
  displayNames,
}: {
  task: Task;
  taskMap: Map<string, Task>;
  agents: AgentState[];
  isLast: boolean;
  onViewWorkLog?: (agentId: string, taskId: string) => void;
  history?: TaskHistoryEntry[];
  displayNames: Record<string, string>;
}) {
  const [artifactsOpen, setArtifactsOpen] = useState(false);

  const assignee = agents.find((a) => a.id === task.assigneeId);
  const deps = task.dependencies
    .map((id) => taskMap.get(id))
    .filter(Boolean) as Task[];
  const blockedByDep = deps.some((d) => d.status !== "done");
  const effectiveStatus =
    task.status === "pending" && blockedByDep ? "waiting" : task.status;
  const statusBadge =
    TASK_STATUS_BADGE[task.status] ?? "bg-gray-800 text-gray-500";
  const statusLabel = TASK_STATUS_LABEL[task.status] ?? task.status;
  const artifactCount = task.artifacts?.length ?? 0;

  return (
    <div className={`flex items-start gap-2 group ${isLast ? "" : "mb-1"}`}>
      {/* Tree line */}
      <div
        className="flex flex-col items-center shrink-0 mt-1"
        style={{ width: 16 }}
      >
        <div className="w-px bg-gray-700 flex-1" style={{ minHeight: 8 }} />
        <div className="w-2 h-px bg-gray-700" />
      </div>

      <div className="flex-1 min-w-0 pb-1.5">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xs shrink-0 mt-0.5" title={task.type}>
            {TASK_TYPE_ICON[task.type]}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-gray-600 font-mono mr-1">
              {task.id}
            </span>
            <span className="text-xs text-gray-300">{task.title}</span>
          </div>
          {assignee ? (
            <div className="flex items-center gap-1 shrink-0 bg-gray-800 rounded px-1.5 py-0.5">
              <span className="text-[10px] text-gray-300">
                {displayNames[assignee.id] ?? assignee.id}
              </span>
              <span className="text-[10px] text-gray-600">
                ({ROLE_ABBR[assignee.role] ?? assignee.role.toUpperCase()})
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-gray-700 shrink-0">未分配</span>
          )}
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${statusBadge}`}
          >
            {effectiveStatus === "waiting" ? "等待依赖" : statusLabel}
          </span>
          {/* Artifacts toggle badge */}
          {task.status === "done" && artifactCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setArtifactsOpen((v) => !v);
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 transition-colors border ${
                artifactsOpen
                  ? "bg-emerald-900/60 text-emerald-300 border-emerald-800/60"
                  : "bg-gray-800/60 text-gray-500 border-gray-700/50 hover:text-emerald-400 hover:border-emerald-800/40"
              }`}
              title={artifactsOpen ? "收起成果物" : "展开成果物"}
            >
              📦 {artifactCount}
            </button>
          )}
          {onViewWorkLog && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewWorkLog(task.assigneeId ?? "sm", task.id);
              }}
              className="text-[10px] text-gray-700 hover:text-blue-400 shrink-0 transition-colors"
              title="查看工作记录"
            >
              💬
            </button>
          )}
        </div>

        {deps.length > 0 && blockedByDep && (
          <div className="text-[10px] text-yellow-700 mt-0.5 pl-5">
            ↳ 等待:{" "}
            {deps
              .filter((d) => d.status !== "done")
              .map((d) => d.id)
              .join(", ")}
          </div>
        )}
        {task.status === "blocked" && task.blockerDescription && (
          <div className="text-[10px] text-red-500 mt-0.5 pl-5 truncate">
            ⛔ {task.blockerDescription}
          </div>
        )}

        {/* Status timeline — auxiliary, low-emphasis */}
        {history && history.length > 0 && (
          <div className="text-[10px] text-gray-700 mt-0.5 pl-5 flex items-center gap-1 flex-wrap leading-tight">
            {history.map((e, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-gray-800">·</span>}
                <span
                  className={
                    e.status === "done"
                      ? "text-green-900"
                      : e.status === "blocked"
                        ? "text-red-900"
                        : ""
                  }
                >
                  {HISTORY_STATUS_LABEL[e.status] ?? e.status}
                </span>
                <span>{fmtHistoryTs(e.timestamp)}</span>
              </span>
            ))}
          </div>
        )}

        {/* Artifacts — collapsed by default, toggled by the badge above */}
        {artifactsOpen && artifactCount > 0 && (
          <div className="mt-1 ml-5">
            <ArtifactList artifacts={task.artifacts!} />
          </div>
        )}
      </div>
    </div>
  );
}

function BacklogItemRow({
  item,
  tasks,
  taskMap,
  agents,
  inSprint,
  onMoveToSprint,
  loadingId,
  onPriorityChange,
  onViewWorkLog,
  defaultExpanded,
  taskHistory,
  displayNames,
}: {
  item: BacklogItem;
  tasks: Task[];
  taskMap: Map<string, Task>;
  agents: AgentState[];
  inSprint: boolean;
  onMoveToSprint: () => void;
  loadingId: string | null;
  onPriorityChange: (itemId: string, delta: -1 | 1) => void;
  onViewWorkLog?: (agentId: string, taskId: string) => void;
  defaultExpanded?: boolean;
  taskHistory: TaskHistoryMap;
  displayNames: Record<string, string>;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? true);
  const [artifactsOpen, setArtifactsOpen] = useState(false);
  const itemTasks = tasks.filter((t) => t.itemId === item.id);
  const doneTasks = itemTasks.filter((t) => t.status === "done").length;
  const priorIdx = Math.min(item.priority - 1, ITEM_PRIORITY_COLORS.length - 1);
  const priorColor =
    ITEM_PRIORITY_COLORS[priorIdx] ??
    ITEM_PRIORITY_COLORS[ITEM_PRIORITY_COLORS.length - 1];
  const loading = loadingId === item.id;

  // Derive display status: all tasks done → treat as done regardless of item.status
  const allTasksDone = itemTasks.length > 0 && doneTasks === itemTasks.length;
  const displayStatus = allTasksDone ? "done" : item.status;
  const statusColor =
    displayStatus === "done"
      ? "text-green-600"
      : displayStatus === "in-progress"
        ? "text-blue-400"
        : "text-gray-500";
  const statusLabel =
    displayStatus === "done"
      ? "完成"
      : displayStatus === "in-progress"
        ? "进行中"
        : "待办";

  // Collect all artifacts for this item
  const allArtifacts =
    displayStatus === "done"
      ? (item.artifacts?.length ?? 0) > 0
        ? (item.artifacts ?? [])
        : itemTasks.flatMap((t) => t.artifacts ?? [])
      : [];

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800/40 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Chevron — leftmost, clear fold/unfold indicator */}
        <span className="text-gray-500 text-[10px] shrink-0 w-3 text-center">
          {expanded ? "▼" : "▶"}
        </span>
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
        <span className={`text-[10px] shrink-0 ${statusColor}`}>
          {statusLabel}
        </span>
        {/* Artifacts toggle badge — rightmost, independent click */}
        {allArtifacts.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setArtifactsOpen((v) => !v);
            }}
            className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 transition-colors border ${
              artifactsOpen
                ? "bg-emerald-900/60 text-emerald-300 border-emerald-800/60"
                : "bg-gray-800/60 text-gray-500 border-gray-700/50 hover:text-emerald-400 hover:border-emerald-800/40"
            }`}
            title={artifactsOpen ? "收起成果物汇总" : "展开成果物汇总"}
          >
            🏆 {allArtifacts.length}
          </button>
        )}
      </div>

      {expanded && itemTasks.length > 0 && (
        <div className="px-3 pb-2 pt-1 border-t border-gray-800/60 bg-gray-900/40">
          {itemTasks.map((task, i) => (
            <TaskRow
              key={task.id}
              task={task}
              taskMap={taskMap}
              agents={agents}
              isLast={i === itemTasks.length - 1}
              onViewWorkLog={onViewWorkLog}
              history={taskHistory[task.id]}
              displayNames={displayNames}
            />
          ))}
        </div>
      )}

      {/* Item-level artifact summary — toggled by the 🏆 badge */}
      {artifactsOpen && allArtifacts.length > 0 && (
        <div className="px-3 py-2 border-t border-emerald-900/30 bg-emerald-950/15">
          <ArtifactList artifacts={allArtifacts} />
        </div>
      )}

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

// ── Sprint section ─────────────────────────────────────────────────────────────

function SprintSection({
  sprint,
  backlog,
  tasks,
  taskMap,
  agents,
  loadingId,
  onMoveToSprint,
  onPriorityChange,
  onViewWorkLog,
  patrolSessions,
  taskHistory,
  displayNames,
}: {
  sprint: Sprint;
  backlog: BacklogItem[];
  tasks: Task[];
  taskMap: Map<string, Task>;
  agents: AgentState[];
  loadingId: string | null;
  onMoveToSprint: (itemId: string) => void;
  onPriorityChange: (itemId: string, delta: -1 | 1) => void;
  onViewWorkLog?: (agentId: string, taskId: string) => void;
  patrolSessions: PatrolSession[];
  taskHistory: TaskHistoryMap;
  displayNames: Record<string, string>;
}) {
  const isDone = sprint.status === "done";
  const [sectionExpanded, setSectionExpanded] = useState(!isDone);

  const badge =
    SPRINT_STATUS_BADGE[sprint.status] ?? "bg-gray-800 text-gray-400";
  const label = SPRINT_STATUS_LABEL[sprint.status] ?? sprint.status;

  const committedItems = sprint.committedItemIds
    .map((id) => backlog.find((b) => b.id === id))
    .filter(Boolean) as BacklogItem[];

  const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
  const doneTasks = sprintTasks.filter((t) => t.status === "done").length;

  return (
    <div className="border border-gray-700/60 rounded-xl overflow-hidden mb-3">
      {/* Sprint header */}
      <div
        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
          isDone
            ? "bg-gray-800/40 hover:bg-gray-800/60"
            : "bg-gray-800/70 hover:bg-gray-800"
        }`}
        onClick={() => setSectionExpanded((v) => !v)}
      >
        <span className="text-gray-500 text-[10px] shrink-0 w-3 text-center">
          {sectionExpanded ? "▼" : "▶"}
        </span>
        <span className="text-xs font-bold text-gray-300">
          {isDone ? "✅" : "🏃"} Sprint {sprint.number}
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
        {sprintTasks.length > 0 && (
          <span className="text-[10px] text-gray-600 shrink-0">
            {doneTasks}/{sprintTasks.length} 任务完成
          </span>
        )}
        {sprint.startedAt && (
          <span className="text-[10px] text-gray-700 shrink-0">
            {new Date(sprint.startedAt).toLocaleDateString("zh-CN")} 起
          </span>
        )}
      </div>

      {sectionExpanded && (
        <div className="p-3 space-y-2 bg-gray-900/20">
          {committedItems.length === 0 ? (
            <div className="text-[11px] text-gray-700 px-2 py-1">
              暂无关联事项
            </div>
          ) : (
            committedItems.map((item) => (
              <BacklogItemRow
                key={item.id}
                item={item}
                tasks={tasks}
                taskMap={taskMap}
                agents={agents}
                inSprint={true}
                onMoveToSprint={() => onMoveToSprint(item.id)}
                loadingId={loadingId}
                onPriorityChange={onPriorityChange}
                onViewWorkLog={onViewWorkLog}
                defaultExpanded={!isDone}
                taskHistory={taskHistory}
                displayNames={displayNames}
              />
            ))
          )}
          <SprintPatrolSubsection
            sprint={sprint}
            patrolSessions={patrolSessions}
          />
        </div>
      )}
    </div>
  );
}

// ── SM Patrol Log ──────────────────────────────────────────────────────────────

interface PatrolSession {
  key: string;
  label: string;
  latestTimestamp?: string;
}

function PatrolSessionRow({ session }: { session: PatrolSession }) {
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!expanded && messages.length === 0) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/messages?agentId=sm&sessionKey=${encodeURIComponent(session.key)}`,
        );
        const data = (await res.json()) as { messages: AgentMessage[] };
        setMessages(data.messages);
      } catch {
        /* ignore */
      }
      setLoading(false);
    }
    setExpanded((v) => !v);
  };

  return (
    <div className="border border-gray-800/60 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer hover:bg-gray-800/30 transition-colors"
        onClick={() => void toggle()}
      >
        <span className="text-[10px] text-gray-500 flex-1 truncate">
          {session.label}
        </span>
        <span className="text-gray-700 text-[10px] shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </div>

      {expanded && (
        <div className="border-t border-gray-800/60 bg-gray-900/40 px-3 py-2 max-h-64 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-[10px] text-gray-600 py-1">加载中...</div>
          ) : messages.length === 0 ? (
            <div className="text-[10px] text-gray-700 py-1">无内容</div>
          ) : (
            messages.map((msg, i) => (
              <div key={i}>
                <div className="text-[9px] mb-0.5">
                  <span
                    className={
                      msg.role === "assistant"
                        ? "text-blue-600"
                        : "text-gray-700"
                    }
                  >
                    {msg.role === "assistant" ? "SM" : "系统"}
                  </span>
                  {msg.timestamp && (
                    <span className="ml-1 text-gray-700">
                      {new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <div
                  className={`text-[10px] whitespace-pre-wrap break-words leading-relaxed ${
                    msg.role === "assistant" ? "text-gray-300" : "text-gray-600"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/** Patrol runs relevant to a sprint, embedded at the bottom of SprintSection. */
function SprintPatrolSubsection({
  sprint,
  patrolSessions,
}: {
  sprint: Sprint;
  patrolSessions: PatrolSession[];
}) {
  const [expanded, setExpanded] = useState(false);

  const startMs = sprint.startedAt ? new Date(sprint.startedAt).getTime() : 0;
  const endMs = sprint.endedAt ? new Date(sprint.endedAt).getTime() : Infinity;

  const relevant = patrolSessions.filter((s) => {
    if (!s.latestTimestamp) return false;
    const ts = new Date(s.latestTimestamp).getTime();
    return ts >= startMs && ts <= endMs;
  });

  if (relevant.length === 0) return null;

  return (
    <div className="border-t border-gray-800/50 mt-2 pt-1">
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-gray-800/20 rounded transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-[10px] text-gray-600 flex-1">
          🔍 SM 巡检 ({relevant.length})
        </span>
        <span className="text-[10px] text-gray-700 shrink-0">
          {expanded ? "▲" : "▼"}
        </span>
      </div>
      {expanded && (
        <div className="px-2 pb-2 space-y-1">
          {relevant.map((s) => (
            <PatrolSessionRow key={s.key} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

interface BacklogTasksPanelProps {
  backlog: BacklogItem[];
  tasks: Task[];
  sprints: Sprint[];
  agents: AgentState[];
  onDataChange?: () => void;
  onViewWorkLog?: (agentId: string, taskId: string) => void;
}

export default function BacklogTasksPanel({
  backlog,
  tasks,
  sprints,
  agents,
  onDataChange,
  onViewWorkLog,
}: BacklogTasksPanelProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const displayNames = useDisplayNames();
  const [patrolSessions, setPatrolSessions] = useState<PatrolSession[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryMap>({});

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/patrol");
        const data = (await res.json()) as { sessions: PatrolSession[] };
        setPatrolSessions(data.sessions ?? []);
      } catch {
        /* ignore */
      }
    };
    void load();
    const t = setInterval(() => void load(), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/task-history");
        const data = (await res.json()) as TaskHistoryMap;
        setTaskHistory(data);
      } catch {
        /* ignore */
      }
    };
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, []);

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // Items not committed to any sprint
  const allCommittedIds = new Set(sprints.flatMap((s) => s.committedItemIds));
  const unplannedItems = [...backlog]
    .filter((item) => !allCommittedIds.has(item.id))
    .sort((a, b) => a.priority - b.priority);

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

  const isEmpty = sprints.length === 0 && backlog.length === 0;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 text-gray-600">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-sm">暂无待办事项</div>
            <div className="text-xs mt-1 text-gray-700">
              点击「给PO派活」开始创建需求
            </div>
          </div>
        ) : (
          <>
            {/* All sprints — active first (sorted by readAllSprints) */}
            {sprints.map((sprint) => (
              <SprintSection
                key={sprint.id}
                sprint={sprint}
                backlog={backlog}
                tasks={tasks}
                taskMap={taskMap}
                agents={agents}
                loadingId={loadingId}
                onMoveToSprint={(id) => void handleMoveToSprint(id)}
                onPriorityChange={(id, d) => void handlePriorityChange(id, d)}
                onViewWorkLog={onViewWorkLog}
                patrolSessions={patrolSessions}
                taskHistory={taskHistory}
                displayNames={displayNames}
              />
            ))}

            {/* Unplanned backlog items */}
            {unplannedItems.length > 0 && (
              <div className="border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-800/30 border-b border-gray-800/60">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    🗂 待规划 Backlog ({unplannedItems.length} 项)
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  {unplannedItems.map((item) => (
                    <BacklogItemRow
                      key={item.id}
                      item={item}
                      tasks={tasks}
                      taskMap={taskMap}
                      agents={agents}
                      inSprint={false}
                      onMoveToSprint={() => void handleMoveToSprint(item.id)}
                      loadingId={loadingId}
                      onPriorityChange={(id, d) =>
                        void handlePriorityChange(id, d)
                      }
                      onViewWorkLog={onViewWorkLog}
                      defaultExpanded={true}
                      taskHistory={taskHistory}
                      displayNames={displayNames}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
