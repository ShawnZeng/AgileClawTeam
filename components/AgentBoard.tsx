"use client";

import type { AgentState, AgentStatus } from "@/lib/types";
import { useDisplayNames } from "@/lib/useDisplayNames";
import { formatAgentLabel } from "@/lib/agentDisplay";
import { AgentAvatar } from "@/components/AgentAvatar";

const STATUS_CONFIG: Record<
  AgentStatus,
  { dot: string; badge: string; label: string }
> = {
  idle: {
    dot: "bg-green-500",
    badge: "bg-green-900 text-green-300",
    label: "Idle",
  },
  working: {
    dot: "bg-blue-500 animate-pulse",
    badge: "bg-blue-900 text-blue-300",
    label: "Working",
  },
  blocked: {
    dot: "bg-yellow-500",
    badge: "bg-yellow-900 text-yellow-300",
    label: "Blocked",
  },
  waiting: {
    dot: "bg-purple-500",
    badge: "bg-purple-900 text-purple-300",
    label: "Waiting",
  },
  offline: {
    dot: "bg-gray-600",
    badge: "bg-gray-800 text-gray-400",
    label: "Offline",
  },
};

function AgentCard({
  agent,
  displayNames,
}: {
  agent: AgentState;
  displayNames: Record<string, string>;
}) {
  const cfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.offline;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AgentAvatar agentId={agent.id} role={agent.role} size={28} />
          <div>
            <div className="text-sm font-semibold text-gray-200">
              {formatAgentLabel(agent.id, agent.role, displayNames)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
      </div>
      {agent.currentTaskId && (
        <div className="text-xs text-gray-500 truncate">
          Task: <span className="text-blue-400">{agent.currentTaskId}</span>
        </div>
      )}
      {agent.lastMessage && (
        <div
          className="text-xs text-gray-500 truncate"
          title={agent.lastMessage}
        >
          {agent.lastMessage}
        </div>
      )}
      <div className="text-xs text-gray-600">
        {new Date(agent.lastActivity).toISOString().slice(11, 19)}
      </div>
    </div>
  );
}

const DEFAULT_AGENTS: AgentState[] = [
  {
    id: "po",
    role: "po",
    status: "offline",
    lastActivity: new Date().toISOString(),
  },
  {
    id: "sm",
    role: "sm",
    status: "offline",
    lastActivity: new Date().toISOString(),
  },
];

export default function AgentBoard({ agents }: { agents: AgentState[] }) {
  const displayNames = useDisplayNames();
  const displayed = agents.length > 0 ? agents : DEFAULT_AGENTS;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Agents
      </h2>
      <div className="grid grid-cols-1 gap-2">
        {displayed.map((agent) => (
          <AgentCard key={agent.id} agent={agent} displayNames={displayNames} />
        ))}
      </div>
    </div>
  );
}
