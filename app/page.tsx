"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  BacklogItem,
  Task,
  Sprint,
  AgentState,
  GatewayStatus,
} from "@/lib/types";
import AgentsPanel from "@/components/AgentsPanel";
import BacklogTasksPanel from "@/components/BacklogTasksPanel";
import POChatPanel from "@/components/POChatPanel";
import AgentSetup from "@/components/AgentSetup";
import ConversationViewer from "@/components/ConversationViewer";

interface SSEPayload {
  type: string;
  data: unknown;
}

type PanelMode = "chat" | "conv";

// ── Gateway status chip ────────────────────────────────────────────────────────
function GatewayChip({ onSetup }: { onSetup: () => void }) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);

  useEffect(() => {
    const doFetch = () =>
      fetch("/api/openclaw")
        .then((r) => r.json() as Promise<GatewayStatus>)
        .then(setStatus)
        .catch(() => setStatus(null));
    doFetch();
    const t = setInterval(doFetch, 5000);
    return () => clearInterval(t);
  }, []);

  const connected = status?.connected ?? false;
  const connecting = !connected && status?.disconnectReason === null;

  if (connected) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-xs text-gray-500">Gateway 已连接</span>
      </div>
    );
  }

  return (
    <button
      onClick={onSetup}
      className="flex items-center gap-1.5 text-xs transition-colors"
    >
      <div
        className={`w-2 h-2 rounded-full shrink-0 ${
          connecting ? "bg-yellow-500 animate-pulse" : "bg-red-500"
        }`}
      />
      <span className={connecting ? "text-yellow-500" : "text-red-400"}>
        {connecting ? "Gateway 连接中" : "Gateway 未连接"}
      </span>
      <span className="text-gray-600 hover:text-gray-400 ml-0.5">
        — 系统配置
      </span>
    </button>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ onGoToSetup }: { onGoToSetup: () => void }) {
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [agents, setAgents] = useState<AgentState[]>([]);

  // Side panel state
  const [panelMode, setPanelMode] = useState<PanelMode | null>("conv");
  const [convAgentId, setConvAgentId] = useState("sm");
  const [convSessionKey, setConvSessionKey] = useState<string | null>(null);
  const [convTaskId, setConvTaskId] = useState<string | null>(null);

  // Resizable panel
  const [panelWidth, setPanelWidth] = useState(520);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(520);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      isResizingRef.current = true;
      startXRef.current = e.clientX;
      startWidthRef.current = panelWidth;
      e.preventDefault();
    },
    [panelWidth],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startXRef.current - e.clientX;
      setPanelWidth(Math.max(280, Math.min(860, startWidthRef.current + delta)));
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const handleSSEPayload = useCallback((payload: SSEPayload) => {
    switch (payload.type) {
      case "backlog":
        setBacklog(payload.data as BacklogItem[]);
        break;
      case "tasks":
        setTasks(payload.data as Task[]);
        break;
      case "sprint":
        setSprints(payload.data as Sprint[]);
        break;
      case "agents":
        setAgents(payload.data as AgentState[]);
        break;
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (event: MessageEvent<string>) => {
      try {
        handleSSEPayload(JSON.parse(event.data) as SSEPayload);
      } catch {
        /* ignore */
      }
    };
    return () => es.close();
  }, [handleSSEPayload]);

  const refreshState = useCallback(async () => {
    try {
      const [bl, tk, sp, ag] = await Promise.all([
        fetch("/api/backlog").then((r) => r.json()) as Promise<BacklogItem[]>,
        fetch("/api/tasks").then((r) => r.json()) as Promise<Task[]>,
        fetch("/api/sprint").then((r) => r.json()) as Promise<Sprint[]>,
        fetch("/api/agents").then((r) => r.json()) as Promise<AgentState[]>,
      ]);
      setBacklog(bl ?? []);
      setTasks(tk ?? []);
      setSprints(Array.isArray(sp) ? sp : []);
      setAgents(ag ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refreshState();
  }, [refreshState]);

  const openChat = useCallback(() => {
    setPanelMode("chat");
  }, []);

  const openConv = useCallback(
    (agentId: string, taskId: string | null, sessionKey?: string) => {
      setConvAgentId(agentId);
      setConvTaskId(taskId);
      setConvSessionKey(sessionKey ?? null);
      setPanelMode("conv");
    },
    [],
  );

  const panelTitle =
    panelMode === "chat"
      ? "给 PO 派活"
      : convTaskId
        ? `${convTaskId} 工作记录`
        : "对话记录";

  const panelSub =
    panelMode === "chat"
      ? "Product Owner · 需求确认与规划"
      : convTaskId
        ? `查看 ${convAgentId} 的任务工作过程`
        : "查看 Agent 工作沟通过程";

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-gray-100">AgileClawTeam</h1>
          <p className="text-[11px] text-gray-600">
            Agile Multi-Agent System · OpenClaw
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GatewayChip onSetup={onGoToSetup} />
          <button
            onClick={() => openConv("sm", null)}
            className="text-xs text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded px-2 py-1 transition-colors"
          >
            💬 对话记录
          </button>
          <button
            onClick={onGoToSetup}
            className="text-xs text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded px-2 py-1 transition-colors"
          >
            系统配置
          </button>
        </div>
      </header>

      {/* Agents row — full width */}
      <AgentsPanel
        agents={agents}
        tasks={tasks}
        onOpenChat={openChat}
      />

      {/* Main area: content + optional side panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Backlog + Tasks */}
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <BacklogTasksPanel
            backlog={backlog}
            tasks={tasks}
            sprints={sprints}
            agents={agents}
            onDataChange={refreshState}
            onViewWorkLog={(agentId, taskId) => {
              openConv(agentId, taskId);
            }}
          />
        </div>

        {/* Drag handle + Persistent side panel */}
        {panelMode !== null && (
          <>
            {/* Drag handle */}
            <div
              className="w-1 shrink-0 cursor-col-resize bg-gray-800 hover:bg-blue-500/40 active:bg-blue-500/60 transition-colors"
              onMouseDown={handleResizeStart}
              title="拖动调整面板宽度"
            />

            {/* Side panel */}
            <div
              className="shrink-0 flex flex-col overflow-hidden bg-gray-950"
              style={{ width: panelWidth }}
            >
            <div className="shrink-0 px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base">
                  {panelMode === "chat" ? "🙎" : "💬"}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-200 truncate">
                    {panelTitle}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{panelSub}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Mode toggle tabs */}
                <button
                  onClick={() => setPanelMode("chat")}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    panelMode === "chat"
                      ? "bg-violet-700 text-violet-100"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  派活
                </button>
                <button
                  onClick={() => setPanelMode("conv")}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    panelMode === "conv"
                      ? "bg-blue-700 text-blue-100"
                      : "bg-gray-800 text-gray-500 hover:text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  记录
                </button>
                <button
                  onClick={() => setPanelMode(null)}
                  className="ml-1 text-gray-600 hover:text-gray-300 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-800 transition-colors text-sm"
                  title="关闭面板"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Panel content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {panelMode === "chat" ? (
                <POChatPanel hideHeader />
              ) : (
                <div className="h-full p-3 overflow-hidden flex flex-col">
                  <ConversationViewer
                    agents={agents}
                    tasks={tasks}
                    initialAgentId={convAgentId}
                    initialSessionKey={convSessionKey ?? undefined}
                    initialTaskId={convTaskId ?? undefined}
                  />
                </div>
              )}
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Page entry ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [agentsReady, setAgentsReady] = useState(false);
  const [manualCheck, setManualCheck] = useState(false);

  if (!agentsReady) {
    return (
      <AgentSetup
        autoAdvance={!manualCheck}
        onComplete={() => {
          setManualCheck(false);
          setAgentsReady(true);
        }}
      />
    );
  }

  return (
    <Dashboard
      onGoToSetup={() => {
        setManualCheck(true);
        setAgentsReady(false);
      }}
    />
  );
}
