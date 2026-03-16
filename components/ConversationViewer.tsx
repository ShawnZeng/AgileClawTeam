"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentMessage, AgentState } from "@/lib/types";

const ROLE_BUBBLE: Record<string, string> = {
  user: "bg-blue-900 text-blue-100 ml-auto",
  assistant: "bg-gray-700 text-gray-200",
  system: "bg-gray-800 text-gray-500 border border-gray-700",
};

const ROLE_ICON: Record<string, string> = {
  po: "🙎",
  sm: "🧑‍💼",
  developer: "💻",
  designer: "🎨",
  tester: "🔍",
};

interface MessagesResponse {
  agentId: string;
  messages: AgentMessage[];
  agentIds: string[];
}

export default function ConversationViewer({
  agents,
}: {
  agents: AgentState[];
}) {
  const [selectedId, setSelectedId] = useState<string>("po");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const allAgentIds = Array.from(
    new Set([...agents.map((a) => a.id), ...agentIds, "po", "sm"]),
  );

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?agentId=${selectedId}`);
        const data = (await res.json()) as MessagesResponse;
        setMessages(data.messages ?? []);
        setAgentIds(data.agentIds ?? []);
      } catch {
        // keep existing messages on error
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const agent = agents.find((a) => a.id === selectedId);
  const roleIcon = agent ? (ROLE_ICON[agent.role] ?? "🤖") : "🤖";

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
          Agent 对话
        </h2>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="bg-gray-800 border border-gray-600 text-gray-300 text-sm rounded px-2 py-1 focus:outline-none focus:border-blue-500"
        >
          {allAgentIds.map((id) => (
            <option key={id} value={id}>
              {ROLE_ICON[agents.find((a) => a.id === id)?.role ?? ""] ?? "🤖"}{" "}
              {id}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 max-h-64 pr-1">
        {messages.length === 0 ? (
          <div className="text-xs text-gray-700 text-center py-8">
            {roleIcon} {selectedId} 暂无对话记录
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 max-w-[85%] ${
                msg.role === "user" ? "ml-auto items-end" : "items-start"
              }`}
            >
              <div className="flex items-center gap-1 text-xs text-gray-600">
                <span>
                  {msg.role === "user" ? "You" : `${roleIcon} ${msg.agentId}`}
                </span>
                <span>{new Date(msg.timestamp).toISOString().slice(11, 19)}</span>
              </div>
              <div
                className={`text-xs px-3 py-2 rounded-lg whitespace-pre-wrap ${
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
