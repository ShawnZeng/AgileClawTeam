"use client";

import { useState, useEffect } from "react";
import type { AgentState, AgentRole, AgentStatus, Task } from "@/lib/types";

// ── Liveness (real session activity) ───────────────────────────────────────────

interface LivenessInfo {
  lastSessionMs: number | null;
  isWarm: boolean;   // < 5 min — currently running
  isRecent: boolean; // < 30 min — recently ran
}

type LivenessMap = Record<string, LivenessInfo>;

// ── Role metadata ──────────────────────────────────────────────────────────────

const ROLE_META: Record<
  AgentRole,
  {
    emoji: string;
    label: string;
    border: string;
    bg: string;
    badge: string;
  }
> = {
  po: {
    emoji: "🙎",
    label: "产品负责人",
    border: "border-violet-700/60",
    bg: "bg-violet-950/40",
    badge: "bg-violet-800/60 text-violet-300",
  },
  sm: {
    emoji: "🧑‍💼",
    label: "Scrum Master",
    border: "border-blue-700/60",
    bg: "bg-blue-950/40",
    badge: "bg-blue-800/60 text-blue-300",
  },
  developer: {
    emoji: "👨‍💻",
    label: "开发工程师",
    border: "border-emerald-700/60",
    bg: "bg-emerald-950/40",
    badge: "bg-emerald-800/60 text-emerald-300",
  },
  designer: {
    emoji: "🎨",
    label: "设计师",
    border: "border-orange-700/60",
    bg: "bg-orange-950/40",
    badge: "bg-orange-800/60 text-orange-300",
  },
  tester: {
    emoji: "🧪",
    label: "测试工程师",
    border: "border-pink-700/60",
    bg: "bg-pink-950/40",
    badge: "bg-pink-800/60 text-pink-300",
  },
};

const STATUS_META: Record<AgentStatus, { dot: string; text: string }> = {
  idle: { dot: "bg-green-500", text: "空闲" },
  working: { dot: "bg-blue-400 animate-pulse", text: "工作中" },
  blocked: { dot: "bg-red-400 animate-pulse", text: "阻塞" },
  waiting: { dot: "bg-yellow-400 animate-pulse", text: "等待中" },
  offline: { dot: "bg-gray-600", text: "离线" },
};

// System agents always shown regardless of agents.json
const SYSTEM_AGENTS: Array<{ id: string; role: AgentRole; workspace: string }> =
  [
    { id: "po", role: "po", workspace: "workspace-po" },
    { id: "sm", role: "sm", workspace: "workspace-sm" },
  ];

// Registered team agents — always shown, status overlaid from agents.json
const DEFAULT_TEAM_AGENTS: Array<{
  id: string;
  role: AgentRole;
  workspace: string;
}> = [
  { id: "designer-1", role: "designer", workspace: "workspace-designer-1" },
  { id: "developer-1", role: "developer", workspace: "workspace-developer-1" },
  { id: "developer-2", role: "developer", workspace: "workspace-developer-2" },
  { id: "tester-1", role: "tester", workspace: "workspace-tester-1" },
];

// ── Doc viewer modal ───────────────────────────────────────────────────────────

function DocModal({
  agentId,
  file,
  onClose,
}: {
  agentId: string;
  file: string;
  onClose: () => void;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setContent(null);
    fetch(`/api/agent-docs?agentId=${agentId}&file=${file}`)
      .then((r) => r.json() as Promise<{ content?: string }>)
      .then((d) => setContent(d.content ?? "（内容为空）"))
      .catch(() => setContent("（加载失败）"))
      .finally(() => setLoading(false));
  }, [agentId, file]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-[680px] max-w-[92vw] max-h-[78vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <span className="text-sm font-semibold text-gray-200">
            {agentId.toUpperCase()} / {file}
          </span>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-lg w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loading ? (
            <div className="text-gray-500 text-sm">加载中...</div>
          ) : (
            <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Single agent card ──────────────────────────────────────────────────────────

function AgentCard({
  id,
  role,
  status,
  workspace,
  currentTask,
  lastMessage,
  lastActivity,
  chatTarget,
  liveness,
  onOpenChat,
}: {
  id: string;
  role: AgentRole;
  status: AgentStatus;
  workspace: string;
  currentTask?: Task;
  lastMessage?: string;
  lastActivity?: string;
  chatTarget?: string;
  liveness?: LivenessInfo;
  onOpenChat?: () => void;
}) {
  const [docModal, setDocModal] = useState<string | null>(null);
  const meta = ROLE_META[role];
  const sm = STATUS_META[status];
  const hasAgentsMd = role === "po" || role === "sm";

  // Override dot color when working but no real session activity
  // Compute session age client-side so it's always up-to-date (not stale server boolean)
  const sessionAge = liveness?.lastSessionMs != null
    ? Date.now() - liveness.lastSessionMs
    : null;
  const isGhost = status === "working" && (sessionAge === null || sessionAge > 30 * 60 * 1000);
  const effectiveDot = isGhost
    ? "bg-amber-400 animate-pulse"
    : status === "working" && sessionAge !== null && sessionAge < 5 * 60 * 1000
      ? "bg-green-400 animate-pulse"
      : sm.dot;

  // Relative session age
  const sessionAgeStr: string | null = (() => {
    if (sessionAge === null) return null;
    const m = Math.floor(sessionAge / 60000);
    if (m < 1) return "刚刚";
    if (m < 60) return `${m}分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}小时前`;
    return `${Math.floor(h / 24)}天前`;
  })();

  return (
    <>
      <div
        className={`shrink-0 w-[220px] flex flex-col gap-2 rounded-xl border p-3 ${meta.border} ${meta.bg}`}
      >
        {/* Avatar + id + role */}
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <span className="text-2xl leading-none">{meta.emoji}</span>
            <span
              className={`absolute -bottom-0.5 -right-1 w-2.5 h-2.5 rounded-full border-2 border-gray-950 ${effectiveDot}`}
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-gray-200 truncate">{id}</div>
            <span className={`text-[10px] px-1 py-0.5 rounded ${meta.badge}`}>
              {meta.label}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${effectiveDot}`} />
          <span>{sm.text}</span>
          {isGhost && (
            <span className="text-amber-500 text-[10px] font-medium">
              ⚠ 无活跃会话{sessionAgeStr ? ` (${sessionAgeStr})` : ""}
            </span>
          )}
          {!isGhost && chatTarget && (
            <span className="text-blue-600 truncate font-medium">↔ {chatTarget}</span>
          )}
        </div>

        {/* Current task */}
        {currentTask ? (
          <div className="text-[10px] leading-tight space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-gray-600 shrink-0">执行：</span>
              <span className="text-gray-500 font-mono font-medium shrink-0">{currentTask.id}</span>
            </div>
            <div className="text-gray-300 line-clamp-2 break-words">{currentTask.title}</div>
            {currentTask.description && (
              <div className="text-gray-600 line-clamp-2 break-words">
                {currentTask.description}
              </div>
            )}
          </div>
        ) : lastMessage ? (
          <div className="text-[10px] text-gray-500 line-clamp-3 leading-tight break-words">
            {lastMessage}
          </div>
        ) : null}

        {/* Workspace */}
        <div
          className="text-[10px] text-gray-700 truncate leading-tight"
          title={`~/.openclaw/${workspace}/`}
        >
          📁 {workspace}/
        </div>

        {/* Session / activity time — ghost already shows age inline in status row */}
        {!isGhost && sessionAgeStr ? (
          <div className="text-[10px] text-gray-700 leading-tight">
            🔌 最后会话: {sessionAgeStr}
          </div>
        ) : lastActivity ? (
          <div className="text-[10px] text-gray-700 leading-tight">
            🕐{" "}
            {new Date(lastActivity).toLocaleString("zh-CN", {
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex items-center gap-1 border-t border-gray-800/60 pt-1.5 mt-auto flex-wrap gap-y-1">
          <button
            onClick={() => setDocModal("SOUL.md")}
            className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
          >
            SOUL
          </button>
          {hasAgentsMd && (
            <button
              onClick={() => setDocModal("AGENTS.md")}
              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-colors"
            >
              AGENTS
            </button>
          )}
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className="text-[10px] px-2 py-0.5 rounded bg-violet-700 hover:bg-violet-600 text-violet-100 transition-colors ml-auto font-medium"
            >
              给PO派活
            </button>
          )}
        </div>
      </div>

      {docModal && (
        <DocModal
          agentId={id}
          file={docModal}
          onClose={() => setDocModal(null)}
        />
      )}
    </>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

interface AgentsPanelProps {
  agents: AgentState[];
  tasks: Task[];
  onOpenChat: () => void;
}

export default function AgentsPanel({
  agents,
  tasks,
  onOpenChat,
}: AgentsPanelProps) {
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const [liveness, setLiveness] = useState<LivenessMap>({});
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/agents/liveness");
        const data = (await res.json()) as LivenessMap;
        setLiveness(data);
      } catch {
        /* ignore */
      }
    };
    void load();
    const t = setInterval(() => void load(), 10000);
    return () => clearInterval(t);
  }, []);

  const allCards = [
    // Always-present system agents (PO + SM)
    ...SYSTEM_AGENTS.map((sa) => {
      const state = agentMap.get(sa.id);
      return {
        id: sa.id,
        role: sa.role,
        status: (state?.status ?? "idle") as AgentStatus,
        workspace: sa.workspace,
        currentTask: state?.currentTaskId
          ? taskMap.get(state.currentTaskId)
          : undefined,
        lastMessage: state?.lastMessage,
        lastActivity: state?.lastActivity,
        chatTarget: state?.talkingTo,
        isSystemPO: sa.id === "po",
      };
    }),
    // Registered team agents (always shown, status from agents.json)
    ...DEFAULT_TEAM_AGENTS.map((ta) => {
      const state = agentMap.get(ta.id);
      return {
        id: ta.id,
        role: ta.role,
        status: (state?.status ?? "offline") as AgentStatus,
        workspace: ta.workspace,
        currentTask: state?.currentTaskId
          ? taskMap.get(state.currentTaskId)
          : undefined,
        lastMessage: state?.lastMessage,
        lastActivity: state?.lastActivity,
        chatTarget: state?.talkingTo,
        isSystemPO: false,
      };
    }),
  ];

  return (
    <div className="shrink-0 border-b border-gray-800 bg-gray-900/30">
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          👥 团队成员
        </span>
        <span className="text-[11px] text-gray-700">
          {allCards.length} 个 Agent
        </span>
      </div>
      <div className="flex gap-3 px-4 pb-3 overflow-x-auto">
        {allCards.map((card) => (
          <AgentCard
            key={card.id}
            id={card.id}
            role={card.role}
            status={card.status}
            workspace={card.workspace}
            currentTask={card.currentTask}
            lastMessage={card.lastMessage}
            lastActivity={card.lastActivity}
            chatTarget={card.chatTarget}
            liveness={liveness[card.id]}
            onOpenChat={card.isSystemPO ? onOpenChat : undefined}
          />
        ))}
      </div>
    </div>
  );
}
