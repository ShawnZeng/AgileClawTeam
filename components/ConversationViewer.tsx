"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentMessage, AgentState, Task } from "@/lib/types";
import type { SessionInfo } from "@/lib/openclaw-session";
import { useDisplayNames } from "@/lib/useDisplayNames";
import { formatAgentLabel } from "@/lib/agentDisplay";
import { AgentAvatar } from "@/components/AgentAvatar";
import { useI18n } from "@/lib/i18n";

const ROLE_BUBBLE: Record<string, string> = {
  user: "bg-blue-900 text-blue-100 ml-auto",
  assistant: "bg-gray-700 text-gray-200",
  system: "bg-gray-800 text-gray-500 border border-gray-700",
};

const TASK_STATUS_LABEL_KEY: Record<string, string> = {
  pending: "status.notStarted",
  "in-progress": "status.inProgress",
  done: "status.done",
  blocked: "status.blocked",
  working: "status.working",
};

const ALL_AGENT_IDS = [
  "po",
  "sm",
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
];

const TEAM_AGENT_IDS = new Set([
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
]);

interface MessagesResponse {
  agentId: string;
  sessionKey: string | null;
  messages: AgentMessage[];
  sessions: SessionInfo[];
  fallback?: boolean;
}

// ── Task info panel (shown for team agents) ────────────────────────────────────

function TaskInfoPanel({ agent, task }: { agent?: AgentState; task?: Task }) {
  const { t, lang } = useI18n();
  const locale = lang === "zh" ? "zh-CN" : "en-US";
  if (!agent && !task) return null;

  return (
    <div className="space-y-2 mb-3">
      {/* Agent status */}
      {agent && (
        <div className="bg-gray-800/60 rounded-lg p-3 space-y-1.5">
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {t("conv.agentStatus")}
          </div>
          {agent.lastMessage && (
            <div className="text-xs text-gray-300 leading-relaxed">
              {agent.lastMessage}
            </div>
          )}
          {agent.lastActivity && (
            <div className="text-[10px] text-gray-600">
              {t("conv.lastActivity")}
              {new Date(agent.lastActivity).toLocaleString(locale, {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </div>
          )}
          {agent.talkingTo && (
            <div className="text-[10px] text-blue-500">
              {t("conv.talkingWith", { agent: agent.talkingTo })}
            </div>
          )}
        </div>
      )}

      {/* Current task */}
      {task && (
        <div className="bg-blue-950/40 border border-blue-800/30 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-semibold text-blue-400">
              {task.id}
            </span>
            <span className="text-[10px] text-gray-600 bg-gray-800 rounded px-1.5 py-0.5">
              {t(TASK_STATUS_LABEL_KEY[task.status] ?? task.status)}
            </span>
            <span className="text-[10px] text-gray-600 bg-gray-800 rounded px-1.5 py-0.5">
              {task.type}
            </span>
          </div>
          <div className="text-xs font-semibold text-gray-200">
            {task.title}
          </div>
          {task.description && (
            <div className="text-xs text-gray-400 leading-relaxed">
              {task.description}
            </div>
          )}
          {task.dependencies.length > 0 && (
            <div className="text-[10px] text-gray-600">
              {t("conv.dependencies", { ids: task.dependencies.join(", ") })}
            </div>
          )}
          {task.blockerDescription && (
            <div className="text-[10px] text-red-400 bg-red-950/40 rounded px-2 py-1">
              ⚠️ {task.blockerDescription}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ConversationViewer({
  agents,
  tasks,
  initialAgentId,
  initialSessionKey,
  initialTaskId,
}: {
  agents: AgentState[];
  tasks: Task[];
  initialAgentId?: string;
  initialSessionKey?: string;
  initialTaskId?: string;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    initialAgentId ?? "po",
  );
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(
    initialSessionKey ?? null,
  );
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [fallback, setFallback] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { t, lang } = useI18n();
  const locale = lang === "zh" ? "zh-CN" : "en-US";

  // When initialAgentId/initialSessionKey props change (e.g. from task button), sync
  useEffect(() => {
    if (initialAgentId) setSelectedAgentId(initialAgentId);
  }, [initialAgentId]);

  useEffect(() => {
    if (initialSessionKey !== undefined)
      setSelectedSessionKey(initialSessionKey ?? null);
  }, [initialSessionKey]);

  // When taskId changes, reset session selection so it can auto-pick the task session
  useEffect(() => {
    setSelectedSessionKey(null);
    setMessages([]);
    setSessions([]);
    setFallback(false);
  }, [initialTaskId]);

  // Reset session selection when agent changes
  const handleAgentChange = useCallback((id: string) => {
    setSelectedAgentId(id);
    setSelectedSessionKey(null);
    setMessages([]);
    setSessions([]);
    setFallback(false);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ agentId: selectedAgentId });
      if (selectedSessionKey) params.set("sessionKey", selectedSessionKey);

      const res = await fetch(`/api/messages?${params.toString()}`);
      const data = (await res.json()) as MessagesResponse;

      setSessions(data.sessions ?? []);
      setMessages(data.messages ?? []);
      setFallback(data.fallback ?? false);

      // If no session selected yet, pick task-specific session first (if taskId provided)
      if (!selectedSessionKey) {
        const taskSession = initialTaskId
          ? (data.sessions ?? []).find((s) => s.taskId === initialTaskId)
          : null;
        const target = taskSession ?? null;
        if (target) {
          setSelectedSessionKey(target.key);
        } else if (data.sessionKey) {
          setSelectedSessionKey(data.sessionKey);
        }
      }
    } catch {
      // keep existing on error
    }
  }, [selectedAgentId, selectedSessionKey, initialTaskId]);

  useEffect(() => {
    void fetchMessages();
    const interval = setInterval(() => void fetchMessages(), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll: read scroll position directly from DOM each time (no stale ref).
  // Only scroll if already near the bottom (same pattern as POChatPanel).
  useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom <= 80) {
      bottomRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages]);

  // When switching agent or session, always jump to bottom immediately
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [selectedAgentId, selectedSessionKey]);

  const agent = agents.find((a) => a.id === selectedAgentId);
  const displayNames = useDisplayNames();
  const currentSession = sessions.find((s) => s.key === selectedSessionKey);

  // Current task for the selected agent
  const currentTask = agent?.currentTaskId
    ? tasks.find((t) => t.id === agent.currentTaskId)
    : undefined;

  const isTeamAgent = TEAM_AGENT_IDS.has(selectedAgentId);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Agent + session selectors */}
      <div className="flex flex-col gap-2 pb-3 shrink-0">
        {/* Agent selector */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-600 shrink-0">Agent</span>
          <select
            value={selectedAgentId}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
          >
            {ALL_AGENT_IDS.map((id) => {
              const a = agents.find((x) => x.id === id);
              return (
                <option key={id} value={id}>
                  {formatAgentLabel(id, a?.role ?? id, displayNames)}
                </option>
              );
            })}
          </select>
        </div>

        {/* Session selector */}
        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 shrink-0">
              {t("conv.session")}
            </span>
            <select
              value={selectedSessionKey ?? ""}
              onChange={(e) => setSelectedSessionKey(e.target.value || null)}
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            >
              {sessions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.taskId ? "📌 " : ""}
                  {s.label} {t("conv.msgCount", { n: String(s.msgCount) })}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Fallback notice */}
        {fallback && (
          <div className="text-[10px] text-amber-600 bg-amber-950/40 border border-amber-800/30 rounded px-2 py-1.5 leading-relaxed">
            ⚠️{" "}
            {t("conv.noOwnSession", {
              agent: formatAgentLabel(
                selectedAgentId,
                agent?.role ?? selectedAgentId,
                displayNames,
              ),
            })}
          </div>
        )}

        {/* Task filter hint */}
        {!fallback && initialTaskId && (
          <div className="text-[10px] text-blue-700 bg-blue-950/40 rounded px-2 py-1">
            {t("conv.taskFilter", { id: initialTaskId })}
            {sessions.some((s) => s.taskId === initialTaskId)
              ? t("conv.foundSession")
              : t("conv.noSession")}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto min-h-0 pr-1">
        {/* Task info panel — always shown for team agents */}
        {isTeamAgent && (agent?.currentTaskId || agent?.lastMessage) && (
          <TaskInfoPanel agent={agent} task={currentTask} />
        )}

        {/* Messages or empty state */}
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="text-xs text-gray-700 text-center py-4">
              {sessions.length === 0
                ? t("conv.noHistory", {
                    agent: formatAgentLabel(
                      selectedAgentId,
                      agent?.role ?? selectedAgentId,
                      displayNames,
                    ),
                  })
                : currentSession
                  ? t("conv.sessionEmpty", { session: currentSession.label })
                  : t("conv.selectSession")}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col gap-1 max-w-[85%] ${
                  msg.role === "user" ? "ml-auto items-end" : "items-start"
                }`}
              >
                <div className="flex items-center gap-1 text-[10px] text-gray-600">
                  {msg.role === "user" ? (
                    <span>{fallback ? t("conv.userPo") : t("conv.you")}</span>
                  ) : (
                    <>
                      <AgentAvatar
                        agentId={selectedAgentId}
                        role={agent?.role ?? "sm"}
                        size={14}
                      />
                      <span>
                        {fallback
                          ? formatAgentLabel("sm", "sm", displayNames)
                          : formatAgentLabel(
                              selectedAgentId,
                              agent?.role ?? "sm",
                              displayNames,
                            )}
                      </span>
                    </>
                  )}
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: false,
                    })}
                  </span>
                </div>
                <div
                  className={`text-xs px-3 py-2 rounded-lg whitespace-pre-wrap break-words ${
                    ROLE_BUBBLE[msg.role] ?? ROLE_BUBBLE.assistant
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
