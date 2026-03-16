"use client";

import type { BacklogItem, Task, Sprint, AgentState } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIORITY_COLOR = [
  "bg-red-900 text-red-300",
  "bg-orange-900 text-orange-300",
  "bg-yellow-900 text-yellow-300",
  "bg-gray-800 text-gray-400",
];

const ROLE_ICON: Record<string, string> = {
  po: "🙎",
  sm: "🧑‍💼",
  developer: "💻",
  designer: "🎨",
  tester: "🔍",
};

const TASK_TYPE_ICON: Record<Task["type"], string> = {
  development: "💻",
  design: "🎨",
  testing: "🔍",
  other: "📝",
};

const AGENT_STATUS_DOT: Record<AgentState["status"], string> = {
  idle: "bg-gray-500",
  working: "bg-blue-400 animate-pulse",
  blocked: "bg-red-400 animate-pulse",
  waiting: "bg-yellow-400",
  offline: "bg-gray-700",
};

const AGENT_STATUS_LABEL: Record<AgentState["status"], string> = {
  idle: "空闲",
  working: "工作中",
  blocked: "阻塞",
  waiting: "等待中",
  offline: "离线",
};

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

// ── Shared sub-components ──────────────────────────────────────────────────────

function ColHeader({
  label,
  count,
  colorClass = "text-gray-500",
}: {
  label: string;
  count: number;
  colorClass?: string;
}) {
  return (
    <div className="shrink-0 px-3 py-2 border-b border-gray-800 flex items-center gap-1.5">
      <span
        className={`text-xs font-semibold uppercase tracking-wider ${colorClass}`}
      >
        {label}
      </span>
      <span className="text-xs text-gray-700">({count})</span>
    </div>
  );
}

// ── Left: Backlog column ───────────────────────────────────────────────────────

const ITEM_STATUS_DOT: Record<BacklogItem["status"], string> = {
  pending: "bg-gray-600",
  "in-progress": "bg-blue-500",
  done: "bg-green-500",
};

function BacklogCard({ item }: { item: BacklogItem }) {
  const priorityColor =
    PRIORITY_COLOR[Math.min(item.priority - 1, PRIORITY_COLOR.length - 1)] ??
    PRIORITY_COLOR[PRIORITY_COLOR.length - 1];
  return (
    <div className="bg-gray-800 border border-gray-700/60 rounded px-2 py-1.5 flex items-start gap-1.5">
      <span
        className={`text-xs px-1 py-0.5 rounded font-mono shrink-0 mt-0.5 ${priorityColor}`}
      >
        P{item.priority}
      </span>
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-medium text-gray-200 leading-snug"
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
          title={item.title}
        >
          {item.title}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${ITEM_STATUS_DOT[item.status]}`}
          />
          <span className="text-xs text-gray-600 font-mono">{item.id}</span>
        </div>
      </div>
    </div>
  );
}

function BacklogColumn({ backlog }: { backlog: BacklogItem[] }) {
  const sorted = [...backlog].sort((a, b) => a.priority - b.priority);
  return (
    <div className="flex flex-col h-full border-r border-gray-800">
      <ColHeader label="待办事项" count={backlog.length} />
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {sorted.length === 0 ? (
          <div className="text-xs text-gray-700 text-center py-6 border border-dashed border-gray-800 rounded">
            暂无待办事项
          </div>
        ) : (
          sorted.map((item) => <BacklogCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

// ── Center: Task kanban ────────────────────────────────────────────────────────

const KANBAN_COLS: {
  label: string;
  colorClass: string;
  filter: (t: Task) => boolean;
}[] = [
  {
    label: "待处理",
    colorClass: "text-gray-400",
    filter: (t) => t.status === "pending" || t.status === "blocked",
  },
  {
    label: "进行中",
    colorClass: "text-blue-400",
    filter: (t) => t.status === "in-progress",
  },
  {
    label: "已完成",
    colorClass: "text-green-400",
    filter: (t) => t.status === "done",
  },
];

function TaskCard({ task, backlog }: { task: Task; backlog: BacklogItem[] }) {
  const isBlocked = task.status === "blocked";
  const linkedItem = backlog.find((b) => b.id === task.itemId);
  return (
    <div
      className={`bg-gray-800 border rounded px-2 py-1.5 ${
        isBlocked ? "border-red-900/70" : "border-gray-700/60"
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-xs shrink-0">{TASK_TYPE_ICON[task.type]}</span>
        <span
          className="text-xs font-medium text-gray-200 truncate leading-snug flex-1"
          title={task.title}
        >
          {task.title}
        </span>
        {isBlocked && (
          <span
            className="text-xs text-red-400 shrink-0"
            title={task.blockerDescription}
          >
            ⛔
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5">
        {task.assigneeId && (
          <span className="text-xs text-purple-400 truncate">
            {task.assigneeId}
          </span>
        )}
        {linkedItem && (
          <span
            className="text-xs text-gray-600 font-mono truncate ml-auto"
            title={linkedItem.title}
          >
            ↑ {linkedItem.id}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanCenter({
  tasks,
  backlog,
}: {
  tasks: Task[];
  backlog: BacklogItem[];
}) {
  return (
    <div className="flex h-full min-w-0">
      {KANBAN_COLS.map((col, idx) => {
        const colTasks = tasks.filter(col.filter);
        return (
          <div
            key={col.label}
            className={`flex flex-col flex-1 min-w-0 h-full ${
              idx < KANBAN_COLS.length - 1 ? "border-r border-gray-800" : ""
            }`}
          >
            <ColHeader
              label={col.label}
              count={colTasks.length}
              colorClass={col.colorClass}
            />
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {colTasks.length === 0 ? (
                <div className="text-xs text-gray-700 text-center py-6 border border-dashed border-gray-800 rounded">
                  暂无
                </div>
              ) : (
                colTasks.map((task) => (
                  <TaskCard key={task.id} task={task} backlog={backlog} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Right: Agent + Sprint column ───────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentState }) {
  return (
    <div className="bg-gray-800 border border-gray-700/60 rounded px-2.5 py-2 flex items-start gap-2">
      <span className="text-base shrink-0 mt-0.5">
        {ROLE_ICON[agent.role] ?? "🤖"}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-200 truncate flex-1">
            {agent.id}
          </span>
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${AGENT_STATUS_DOT[agent.status]}`}
            title={AGENT_STATUS_LABEL[agent.status]}
          />
        </div>
        <div className="text-xs text-gray-600 mt-0.5">
          {AGENT_STATUS_LABEL[agent.status]}
          {agent.currentTaskId && (
            <span className="text-gray-700 ml-1">· {agent.currentTaskId}</span>
          )}
        </div>
        {agent.lastMessage && (
          <div
            className="text-xs text-gray-500 mt-1 truncate italic"
            title={agent.lastMessage}
          >
            "{agent.lastMessage}"
          </div>
        )}
      </div>
    </div>
  );
}

function SprintMini({ sprint }: { sprint: Sprint | null }) {
  if (!sprint?.id) {
    return (
      <div className="text-xs text-gray-700 text-center py-2 border border-dashed border-gray-800 rounded">
        暂无 Sprint
      </div>
    );
  }
  const phaseLabel = PHASE_LABELS[sprint.status ?? ""] ?? sprint.status;
  const phaseColor =
    PHASE_COLORS[sprint.status ?? ""] ?? "bg-gray-800 text-gray-400";
  return (
    <div className="bg-gray-800 border border-gray-700/60 rounded px-2.5 py-2">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-medium text-gray-300">
          Sprint {sprint.number ?? "—"}
        </span>
        <span
          className={`text-xs px-1.5 py-0.5 rounded-full font-medium shrink-0 ${phaseColor}`}
        >
          {phaseLabel}
        </span>
      </div>
      {sprint.goal && (
        <p className="text-xs text-gray-600 mt-1 truncate" title={sprint.goal}>
          {sprint.goal}
        </p>
      )}
      <div className="text-xs text-gray-700 mt-0.5">
        承诺 {sprint.committedItemIds?.length ?? 0} 个需求
      </div>
    </div>
  );
}

function AgentColumn({
  agents,
  sprint,
}: {
  agents: AgentState[];
  sprint: Sprint | null;
}) {
  return (
    <div className="flex flex-col h-full border-l border-gray-800">
      <ColHeader label="团队状态" count={agents.length} />
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {agents.length === 0 ? (
          <div className="text-xs text-gray-700 text-center py-6 border border-dashed border-gray-800 rounded">
            暂无 Agent
          </div>
        ) : (
          agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)
        )}
      </div>
      <div className="shrink-0 p-2 border-t border-gray-800 space-y-1.5">
        <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          Sprint
        </div>
        <SprintMini sprint={sprint} />
      </div>
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export interface BoardViewProps {
  backlog: BacklogItem[];
  tasks: Task[];
  sprint: Sprint | null;
  agents: AgentState[];
  onGoToChat: () => void;
  onDataChange: () => void;
}

export default function BoardView({
  backlog,
  tasks,
  sprint,
  agents,
}: BoardViewProps) {
  return (
    <div className="flex h-full min-h-0">
      {/* Left: Backlog */}
      <div className="w-[220px] shrink-0 flex flex-col h-full overflow-hidden">
        <BacklogColumn backlog={backlog} />
      </div>

      {/* Center: Task kanban */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <KanbanCenter tasks={tasks} backlog={backlog} />
      </div>

      {/* Right: Agents + Sprint */}
      <div className="w-[220px] shrink-0 flex flex-col h-full overflow-hidden">
        <AgentColumn agents={agents} sprint={sprint} />
      </div>
    </div>
  );
}
