"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type {
  AgentRole,
  AgentState,
  AgentStatus,
  LivenessInfo,
  LivenessMap,
  Task,
} from "@/lib/types";
import {
  DEFAULT_DISPLAY_NAMES,
  DISPLAY_NAMES_STORAGE_KEY,
} from "@/lib/useDisplayNames";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useI18n } from "@/lib/i18n";

interface ModelOption {
  fullId: string;
  name: string;
  provider: string;
  isCode: boolean;
}

const ROLE_META: Record<
  AgentRole,
  {
    labelKey: string;
    border: string;
    bg: string;
    badge: string;
    glowColor: string;
  }
> = {
  po: {
    labelKey: "role.po",
    border: "border-violet-700/60",
    bg: "bg-violet-950/40",
    badge: "bg-violet-800/60 text-violet-300",
    glowColor: "#8b5cf6",
  },
  sm: {
    labelKey: "role.sm",
    border: "border-sky-700/60",
    bg: "bg-sky-950/40",
    badge: "bg-sky-800/60 text-sky-300",
    glowColor: "#38bdf8",
  },
  developer: {
    labelKey: "role.developer",
    border: "border-emerald-700/60",
    bg: "bg-emerald-950/40",
    badge: "bg-emerald-800/60 text-emerald-300",
    glowColor: "#10b981",
  },
  designer: {
    labelKey: "role.designer",
    border: "border-amber-700/60",
    bg: "bg-amber-950/40",
    badge: "bg-amber-800/60 text-amber-300",
    glowColor: "#f59e0b",
  },
  tester: {
    labelKey: "role.tester",
    border: "border-rose-700/60",
    bg: "bg-rose-950/40",
    badge: "bg-rose-800/60 text-rose-300",
    glowColor: "#f43f5e",
  },
};

const STATUS_META: Record<AgentStatus, { dot: string; textKey: string }> = {
  idle: { dot: "bg-green-500", textKey: "status.idle" },
  working: { dot: "bg-sky-400 animate-pulse", textKey: "status.working" },
  blocked: { dot: "bg-red-400 animate-pulse", textKey: "status.blocked" },
  waiting: { dot: "bg-amber-400 animate-pulse", textKey: "status.waiting" },
  offline: { dot: "bg-gray-600", textKey: "status.offline" },
};

const SYSTEM_AGENTS: Array<{ id: string; role: AgentRole; workspace: string }> =
  [
    { id: "po", role: "po", workspace: "workspace-po" },
    { id: "sm", role: "sm", workspace: "workspace-sm" },
  ];

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

const STALE_WORKING_MS = 30 * 60 * 1000;

function deriveEffectiveStatus(
  status: AgentStatus,
  liveness?: LivenessInfo,
): AgentStatus {
  if (liveness?.isRunningNow || liveness?.hasRunningCron) return "working";
  if (status === "blocked" || status === "waiting" || status === "offline") {
    return status;
  }
  return "idle";
}

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
  const { t } = useI18n();

  useEffect(() => {
    fetch(`/api/agent-docs?agentId=${agentId}&file=${file}`)
      .then((response) => response.json() as Promise<{ content?: string }>)
      .then((data) => setContent(data.content ?? t("agents.docEmpty")))
      .catch(() => setContent(t("agents.docError")))
      .finally(() => setLoading(false));
  }, [agentId, file, t]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-[680px] max-w-[92vw] max-h-[78vh] flex flex-col shadow-2xl"
        onClick={(event) => event.stopPropagation()}
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
            <div className="text-gray-500 text-sm">
              {t("agents.docLoading")}
            </div>
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

function ModelPickerModal({
  agentId,
  role,
  currentModel,
  models,
  onSelect,
  onClose,
}: {
  agentId: string;
  role: AgentRole;
  currentModel: string;
  models: ModelOption[];
  onSelect: (model: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isCodeRole = role === "developer";

  // For developer role: code models first, then alphabetical within groups
  const sorted = isCodeRole
    ? [...models.filter((m) => m.isCode), ...models.filter((m) => !m.isCode)]
    : models;

  // Group by provider
  const byProvider: [string, ModelOption[]][] = [];
  for (const m of sorted) {
    const existing = byProvider.find(([p]) => p === m.provider);
    if (existing) existing[1].push(m);
    else byProvider.push([m.provider, [m]]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-[480px] max-w-[92vw] max-h-[72vh] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 shrink-0">
          <div>
            <span className="text-sm font-semibold text-gray-200">
              {t("agents.selectModel")}
            </span>
            <span className="text-xs text-gray-600 ml-2 font-mono">
              {agentId}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-200 text-lg w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0 space-y-3">
          {byProvider.length === 0 ? (
            <div className="text-xs text-gray-600 text-center py-8">
              {t("agents.noModels")}
            </div>
          ) : (
            byProvider.map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-1.5 px-1">
                  {provider}
                </div>
                <div className="space-y-1">
                  {providerModels.map((m) => {
                    const isCurrent = m.fullId === currentModel;
                    return (
                      <button
                        key={m.fullId}
                        onClick={() => onSelect(m.fullId)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                          isCurrent
                            ? "bg-blue-900/60 border border-blue-700/60 text-blue-200"
                            : "bg-gray-800 hover:bg-gray-750 text-gray-300 border border-transparent hover:border-gray-700"
                        }`}
                      >
                        <span className="flex-1 font-mono truncate">
                          {m.fullId}
                        </span>
                        {isCurrent && (
                          <span className="text-blue-400 text-[10px] shrink-0">
                            {t("agents.currentModel")}
                          </span>
                        )}
                        {m.isCode && isCodeRole && !isCurrent && (
                          <span className="text-emerald-400 text-[10px] font-semibold shrink-0">
                            CODE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {isCodeRole && (
          <div className="shrink-0 px-4 py-2 border-t border-gray-800 text-[10px] text-emerald-500">
            {t("agents.codeModelTip")}
          </div>
        )}
      </div>
    </div>
  );
}

function TalkingIndicator({
  targetName,
  color,
}: {
  targetName: string;
  color: string;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <div className="flex items-center gap-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: color,
            animation: "chatDot 1.2s 0s ease-in-out infinite",
          }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: color,
            animation: "chatDot 1.2s 0.18s ease-in-out infinite",
          }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{
            backgroundColor: color,
            animation: "chatDot 1.2s 0.36s ease-in-out infinite",
          }}
        />
      </div>
      <span className="text-[10px] font-medium truncate" style={{ color }}>
        {t("agents.talkingWith", { name: targetName })}
      </span>
    </div>
  );
}

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
  nowMs,
  displayName,
  allNames,
  onRename,
  currentModel,
  availableModels,
  onModelChange,
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
  nowMs: number;
  displayName: string;
  allNames: Record<string, string>;
  onRename: (name: string) => void;
  currentModel: string;
  availableModels: ModelOption[];
  onModelChange: (agentId: string, model: string) => void;
}) {
  const [docModal, setDocModal] = useState<string | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState(displayName);
  const { t, lang } = useI18n();

  useEffect(() => {
    setEditingName(displayName);
  }, [displayName]);

  const meta = ROLE_META[role];
  const effectiveStatus = deriveEffectiveStatus(status, liveness);
  const statusMeta = STATUS_META[effectiveStatus];
  const hasAgentsMd = true;
  const sessionAge =
    liveness?.lastSessionMs != null ? nowMs - liveness.lastSessionMs : null;
  const isStaleWorking =
    status === "working" &&
    !(liveness?.isRunningNow || liveness?.hasRunningCron) &&
    (sessionAge === null || sessionAge > STALE_WORKING_MS);
  const effectiveDot = isStaleWorking
    ? "bg-amber-400 animate-pulse"
    : effectiveStatus === "working"
      ? "bg-green-400 animate-pulse"
      : statusMeta.dot;
  const sessionAgeStr = (() => {
    if (sessionAge === null) return null;
    const minutes = Math.floor(sessionAge / 60000);
    if (minutes < 1) return t("agents.timeJustNow");
    if (minutes < 60) return t("agents.timeMinutes", { n: String(minutes) });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("agents.timeHours", { n: String(hours) });
    return t("agents.timeDays", { n: String(Math.floor(hours / 24)) });
  })();
  const derivedTargetName =
    chatTarget && liveness?.conversation.isTalkingNow
      ? (allNames[chatTarget] ?? chatTarget)
      : null;
  const humanTargetName = liveness?.conversation.peerLabel;
  const talkingTargetName = derivedTargetName ?? humanTargetName;
  const isTalkingNow = Boolean(
    talkingTargetName && liveness?.conversation.isTalkingNow,
  );

  const saveName = () => {
    const nextName = editingName.trim();
    setIsEditingName(false);
    if (!nextName || nextName === displayName) return;
    onRename(nextName);
  };

  return (
    <>
      <div
        className={`shrink-0 w-[246px] flex flex-col gap-2.5 rounded-2xl border px-3.5 py-3 transition-shadow duration-300 ${meta.border} ${meta.bg} ${isTalkingNow ? "agent-talking" : ""}`}
        style={
          isTalkingNow
            ? ({ "--glow-color": meta.glowColor } as CSSProperties)
            : undefined
        }
      >
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <AgentAvatar agentId={id} role={role} />
          </div>
          <div className="min-w-0 flex-1">
            {isEditingName ? (
              <input
                autoFocus
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
                onBlur={saveName}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveName();
                  if (event.key === "Escape") {
                    setEditingName(displayName);
                    setIsEditingName(false);
                  }
                }}
                className="w-full bg-transparent border-b border-violet-400 text-sm font-bold text-gray-100 outline-none leading-tight"
              />
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                title={t("agents.editName")}
                className="group flex items-center gap-1 text-sm font-bold text-gray-100 hover:text-white transition-colors max-w-full"
              >
                <span className="truncate">{displayName}</span>
                <span className="text-[10px] text-gray-700 group-hover:text-gray-400 transition-colors">
                  ✎
                </span>
              </button>
            )}
            <div className="text-[10px] text-gray-600 font-mono truncate">
              {id}
            </div>
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${meta.badge}`}
              >
                {t(meta.labelKey)}
              </span>
              <span className="text-[10px] text-gray-500">
                {t("agents.nameHint")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-gray-400 flex-wrap">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${effectiveDot}`}
          />
          <span>{t(statusMeta.textKey)}</span>
          {isStaleWorking && (
            <span className="text-amber-500 text-[10px] font-medium">
              {t("agents.staleSession", {
                age: sessionAgeStr ? ` (${sessionAgeStr})` : "",
              })}
            </span>
          )}
        </div>

        {isTalkingNow && talkingTargetName && (
          <TalkingIndicator
            targetName={talkingTargetName}
            color={meta.glowColor}
          />
        )}

        {currentTask ? (
          <div className="text-[10px] leading-tight space-y-0.5">
            <div className="flex items-center gap-1">
              <span className="text-gray-600 shrink-0">
                {t("agents.executing")}
              </span>
              <span className="text-gray-500 font-mono font-medium shrink-0">
                {currentTask.id}
              </span>
            </div>
            <div className="text-gray-200 line-clamp-2 break-words">
              {currentTask.title}
            </div>
            {currentTask.description && (
              <div className="text-gray-500 line-clamp-2 break-words">
                {currentTask.description}
              </div>
            )}
          </div>
        ) : lastMessage ? (
          <div className="text-[10px] text-gray-500 line-clamp-3 leading-tight break-words">
            {lastMessage}
          </div>
        ) : (
          <div className="text-[10px] text-gray-600 leading-tight">
            {t("agents.idle")}
          </div>
        )}

        <div
          className="text-[10px] text-gray-700 truncate leading-tight"
          title={`~/.openclaw/${workspace}/`}
        >
          📁 {workspace}/
        </div>

        {sessionAgeStr ? (
          <div className="text-[10px] text-gray-700 leading-tight">
            {t("agents.lastSession", { time: sessionAgeStr ?? "" })}
          </div>
        ) : lastActivity ? (
          <div className="text-[10px] text-gray-700 leading-tight">
            🕐{" "}
            {new Date(lastActivity).toLocaleString(
              lang === "zh" ? "zh-CN" : "en-US",
              {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              },
            )}
          </div>
        ) : null}

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
              {t("agents.assignToPO")}
            </button>
          )}
        </div>

        {/* Model selector row */}
        <button
          onClick={() => setModelPickerOpen(true)}
          title={t("agents.changeModel")}
          className="w-full text-left text-[10px] text-gray-600 hover:text-gray-400 font-mono truncate transition-colors leading-tight"
        >
          ⚡{" "}
          {currentModel
            ? currentModel.split("/").pop()
            : t("agents.notConfigured")}{" "}
          <span className="text-gray-700 not-italic normal-case font-sans">
            {t("agents.clickToSwitch")}
          </span>
        </button>
      </div>

      {docModal && (
        <DocModal
          key={`${id}:${docModal}`}
          agentId={id}
          file={docModal}
          onClose={() => setDocModal(null)}
        />
      )}
      {modelPickerOpen && (
        <ModelPickerModal
          agentId={id}
          role={role}
          currentModel={currentModel}
          models={availableModels}
          onSelect={(model) => {
            onModelChange(id, model);
            setModelPickerOpen(false);
          }}
          onClose={() => setModelPickerOpen(false)}
        />
      )}
    </>
  );
}

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
  const agentMap = new Map(agents.map((agent) => [agent.id, agent]));
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const [liveness, setLiveness] = useState<LivenessMap>({});
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { t } = useI18n();
  const [displayNames, setDisplayNames] = useState<Record<string, string>>(
    () => {
      if (typeof window === "undefined") return DEFAULT_DISPLAY_NAMES;
      try {
        const saved = window.localStorage.getItem(DISPLAY_NAMES_STORAGE_KEY);
        if (!saved) return DEFAULT_DISPLAY_NAMES;
        const parsed = JSON.parse(saved) as Record<string, string>;
        return { ...DEFAULT_DISPLAY_NAMES, ...parsed };
      } catch {
        return DEFAULT_DISPLAY_NAMES;
      }
    },
  );
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [agentModels, setAgentModels] = useState<Record<string, string>>({});

  const renameAgent = useCallback((agentId: string, name: string) => {
    setDisplayNames((current) => {
      const next = { ...current, [agentId]: name };
      try {
        localStorage.setItem(DISPLAY_NAMES_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/agents/liveness");
        const data = (await response.json()) as LivenessMap;
        setLiveness(data);
      } catch {
        // ignore
      }
    };

    void load();
    const timer = setInterval(() => {
      void load();
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load available models + per-agent model config once on mount
  useEffect(() => {
    fetch("/api/agent-models")
      .then(
        (r) =>
          r.json() as Promise<{
            models: ModelOption[];
            agentModels: Record<string, string>;
          }>,
      )
      .then(({ models, agentModels: am }) => {
        setAvailableModels(models);
        setAgentModels(am);
      })
      .catch(() => {
        // ignore fetch errors (gateway may be down)
      });
  }, []);

  const handleModelChange = useCallback(
    async (agentId: string, model: string) => {
      setAgentModels((prev) => ({ ...prev, [agentId]: model }));
      try {
        await fetch("/api/agent-models", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId, model }),
        });
      } catch {
        // ignore write errors
      }
    },
    [],
  );

  const cards = [
    ...SYSTEM_AGENTS.map((agent) => {
      const state = agentMap.get(agent.id);
      return {
        id: agent.id,
        role: agent.role,
        status: (state?.status ?? "idle") as AgentStatus,
        workspace: agent.workspace,
        currentTask: state?.currentTaskId
          ? taskMap.get(state.currentTaskId)
          : undefined,
        lastMessage: state?.lastMessage,
        lastActivity: state?.lastActivity,
        chatTarget: state?.talkingTo,
        isSystemPo: agent.id === "po",
      };
    }),
    ...DEFAULT_TEAM_AGENTS.map((agent) => {
      const state = agentMap.get(agent.id);
      return {
        id: agent.id,
        role: agent.role,
        status: (state?.status ?? "offline") as AgentStatus,
        workspace: agent.workspace,
        currentTask: state?.currentTaskId
          ? taskMap.get(state.currentTaskId)
          : undefined,
        lastMessage: state?.lastMessage,
        lastActivity: state?.lastActivity,
        chatTarget: state?.talkingTo,
        isSystemPo: false,
      };
    }),
  ];

  return (
    <div className="shrink-0 border-b border-gray-800 bg-gray-900/30">
      <div className="px-4 pt-3 pb-1 flex items-center gap-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {t("agents.title")}
        </span>
        <span className="text-[11px] text-gray-700">
          {t("agents.count", { n: String(cards.length) })}
        </span>
      </div>
      <div className="flex gap-3 px-4 pb-3 overflow-x-auto">
        {cards.map((card) => (
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
            onOpenChat={card.isSystemPo ? onOpenChat : undefined}
            nowMs={nowMs}
            displayName={displayNames[card.id] ?? card.id}
            allNames={displayNames}
            onRename={(name) => renameAgent(card.id, name)}
            currentModel={agentModels[card.id] ?? ""}
            availableModels={availableModels}
            onModelChange={handleModelChange}
          />
        ))}
      </div>
    </div>
  );
}
