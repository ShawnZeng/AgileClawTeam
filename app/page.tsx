"use client";

import { useEffect, useState, useCallback } from "react";
import type { BacklogItem, Task, Sprint, AgentState, GatewayStatus } from "@/lib/types";
import AgentsPanel from "@/components/AgentsPanel";
import BacklogTasksPanel from "@/components/BacklogTasksPanel";
import POChatPanel from "@/components/POChatPanel";
import AgentSetup from "@/components/AgentSetup";

interface SSEPayload {
  type: string;
  data: unknown;
}

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
      <span className="text-gray-600 hover:text-gray-400 ml-0.5">— 系统检查</span>
    </button>
  );
}

// ── Chat drawer ────────────────────────────────────────────────────────────────
function ChatDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={onClose}
        />
      )}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[420px] z-40 flex flex-col
          bg-gray-950 border-l border-gray-700 shadow-2xl
          transition-transform duration-300
          ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">🙎</span>
            <div>
              <div className="text-sm font-semibold text-gray-200">给 PO 派活</div>
              <div className="text-xs text-gray-500">Product Owner · 需求确认与规划</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-800 transition-colors"
            title="关闭聊天"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <POChatPanel hideHeader />
        </div>
      </div>
    </>
  );
}

// ── Main dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ onGoToSetup }: { onGoToSetup: () => void }) {
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [tasks, setTasks]     = useState<Task[]>([]);
  const [sprint, setSprint]   = useState<Sprint | null>(null);
  const [agents, setAgents]   = useState<AgentState[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

  const handleSSEPayload = useCallback((payload: SSEPayload) => {
    switch (payload.type) {
      case "backlog": setBacklog(payload.data as BacklogItem[]); break;
      case "tasks":   setTasks(payload.data as Task[]);          break;
      case "sprint":  setSprint(payload.data as Sprint);         break;
      case "agents":  setAgents(payload.data as AgentState[]);   break;
    }
  }, []);

  useEffect(() => {
    const es = new EventSource("/api/stream");
    es.onmessage = (event: MessageEvent<string>) => {
      try { handleSSEPayload(JSON.parse(event.data) as SSEPayload); } catch { /* ignore */ }
    };
    return () => es.close();
  }, [handleSSEPayload]);

  const refreshState = useCallback(async () => {
    try {
      const [bl, tk, sp, ag] = await Promise.all([
        fetch("/api/backlog").then((r) => r.json()) as Promise<BacklogItem[]>,
        fetch("/api/tasks").then((r) => r.json()) as Promise<Task[]>,
        fetch("/api/sprint").then((r) => r.json()) as Promise<Sprint | null>,
        fetch("/api/agents").then((r) => r.json()) as Promise<AgentState[]>,
      ]);
      setBacklog(bl ?? []);
      setTasks(tk ?? []);
      setSprint(sp);
      setAgents(ag ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void refreshState(); }, [refreshState]);

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="shrink-0 px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold text-gray-100">AgileAgentsTeam</h1>
          <p className="text-[11px] text-gray-600">Scrum Multi-Agent System · OpenClaw</p>
        </div>
        <div className="flex items-center gap-3">
          <GatewayChip onSetup={onGoToSetup} />
          <button
            onClick={onGoToSetup}
            className="text-xs text-gray-600 hover:text-gray-300 border border-gray-800 hover:border-gray-600 rounded px-2 py-1 transition-colors"
          >
            系统检查
          </button>
        </div>
      </header>

      {/* Agents row */}
      <AgentsPanel
        agents={agents}
        tasks={tasks}
        onOpenChat={() => setChatOpen(true)}
      />

      {/* Backlog + Tasks */}
      <BacklogTasksPanel
        backlog={backlog}
        tasks={tasks}
        sprint={sprint}
        agents={agents}
        onDataChange={refreshState}
      />

      {/* Chat drawer */}
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
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
        onComplete={() => { setManualCheck(false); setAgentsReady(true); }}
      />
    );
  }

  return (
    <Dashboard
      onGoToSetup={() => { setManualCheck(true); setAgentsReady(false); }}
    />
  );
}
