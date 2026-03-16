"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { AgentMessage, AgentState } from "@/lib/types";
import type { SessionInfo } from "@/lib/openclaw-session";

const ROLE_BUBBLE: Record<string, string> = {
  user: "bg-blue-900 text-blue-100 ml-auto",
  assistant: "bg-gray-700 text-gray-200",
  system: "bg-gray-800 text-gray-500 border border-gray-700",
};

const ROLE_ICON: Record<string, string> = {
  po: "🙎",
  sm: "🧑‍💼",
  developer: "👨‍💻",
  designer: "🎨",
  tester: "🧪",
};

const ALL_AGENT_IDS = [
  "po",
  "sm",
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
];

interface MessagesResponse {
  agentId: string;
  sessionKey: string | null;
  messages: AgentMessage[];
  sessions: SessionInfo[];
}

export default function ConversationViewer({
  agents,
  initialAgentId,
  initialSessionKey,
}: {
  agents: AgentState[];
  initialAgentId?: string;
  initialSessionKey?: string;
}) {
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    initialAgentId ?? "po",
  );
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selectedSessionKey, setSelectedSessionKey] = useState<string | null>(
    initialSessionKey ?? null,
  );
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // When initialAgentId/initialSessionKey props change (e.g. from task button), sync
  useEffect(() => {
    if (initialAgentId) setSelectedAgentId(initialAgentId);
  }, [initialAgentId]);

  useEffect(() => {
    if (initialSessionKey !== undefined)
      setSelectedSessionKey(initialSessionKey ?? null);
  }, [initialSessionKey]);

  // Reset session selection when agent changes
  const handleAgentChange = useCallback((id: string) => {
    setSelectedAgentId(id);
    setSelectedSessionKey(null);
    setMessages([]);
    setSessions([]);
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ agentId: selectedAgentId });
      if (selectedSessionKey) params.set("sessionKey", selectedSessionKey);

      const res = await fetch(`/api/messages?${params.toString()}`);
      const data = (await res.json()) as MessagesResponse;

      setSessions(data.sessions ?? []);
      setMessages(data.messages ?? []);

      // Auto-select first session if none selected
      if (!selectedSessionKey && data.sessionKey) {
        setSelectedSessionKey(data.sessionKey);
      }
    } catch {
      // keep existing on error
    }
  }, [selectedAgentId, selectedSessionKey]);

  useEffect(() => {
    void fetchMessages();
    const interval = setInterval(() => void fetchMessages(), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const agent = agents.find((a) => a.id === selectedAgentId);
  const roleIcon = agent ? (ROLE_ICON[agent.role] ?? "🤖") : "🤖";
  const currentSession = sessions.find((s) => s.key === selectedSessionKey);

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
              const icon = a ? (ROLE_ICON[a.role] ?? "🤖") : "🤖";
              return (
                <option key={id} value={id}>
                  {icon} {id}
                </option>
              );
            })}
          </select>
        </div>

        {/* Session selector */}
        {sessions.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600 shrink-0">会话</span>
            <select
              value={selectedSessionKey ?? ""}
              onChange={(e) => setSelectedSessionKey(e.target.value || null)}
              className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500"
            >
              {sessions.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label} ({s.msgCount} 条)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-1">
        {messages.length === 0 ? (
          <div className="text-xs text-gray-700 text-center py-8">
            {sessions.length === 0
              ? `${roleIcon} ${selectedAgentId} 暂无对话记录`
              : currentSession
                ? `${currentSession.label} 暂无消息`
                : "请选择会话"}
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
                <span>
                  {msg.role === "user" ? "用户" : `${roleIcon} ${msg.agentId}`}
                </span>
                <span>
                  {new Date(msg.timestamp).toISOString().slice(11, 19)}
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
  );
}
