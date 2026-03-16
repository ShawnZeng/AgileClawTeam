// Shared TypeScript types for AgileAgentsTeam

export interface BacklogItem {
  id: string; // "ITEM-001"
  title: string;
  description: string;
  priority: number; // 1 = highest
  status: "pending" | "in-progress" | "done";
  acceptanceCriteria: string[];
  taskIds: string[];
  sprintId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string; // "TASK-001"
  title: string;
  description: string;
  itemId: string;
  type: "development" | "design" | "testing" | "other";
  assigneeId?: string;
  status: "pending" | "in-progress" | "done" | "blocked";
  dependencies: string[];
  sprintId: string;
  blockerDescription?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SprintRetrospective {
  keep: string[];
  drop: string[];
  puzzle: string[];
  improvementTaskIds: string[];
}

export interface Sprint {
  id: string; // "SPRINT-001"
  number: number;
  goal: string;
  status: "planning" | "execution" | "review" | "retrospective" | "done";
  committedItemIds: string[];
  startedAt?: string;
  endedAt?: string;
  retrospective?: SprintRetrospective;
}

export type AgentRole = "po" | "sm" | "developer" | "designer" | "tester";
export type AgentStatus =
  | "idle"
  | "working"
  | "blocked"
  | "waiting"
  | "offline";

export interface AgentState {
  id: string; // "developer-1", "designer-1", etc.
  role: AgentRole;
  status: AgentStatus;
  currentTaskId?: string;
  subagentSessionKey?: string;
  lastActivity: string;
  lastMessage?: string;
}

export interface AgentMessage {
  agentId: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export type DisconnectReason =
  | "not_started" // ECONNREFUSED — gateway not running
  | "auth_failed" // Token mismatch or nonce error
  | "network_error" // Other network error
  | null; // No error (connected or still connecting)

export interface GatewayStatus {
  address: string;
  httpUrl: string;
  connected: boolean;
  version: string | null;
  latencyMs: number | null;
  disconnectReason: DisconnectReason;
  hasToken: boolean;
  installDir: string;
}

export interface SetupCheckResult {
  // CLI
  cliInstalled: boolean;
  cliVersion: string | null;
  cliVersionOk: boolean;
  // Gateway — two levels, matching /api/openclaw logic
  gatewayRunning: boolean; // HTTP /health OK (process is up)
  gatewayConnected: boolean; // WS handshake complete (can make RPC calls)
  gatewayAddress?: string; // ws:// address for display
  // Agents
  hasAgents: boolean;
  missingAgents: string[];
  // Meta
  installDir: string;
  error?: string;
}

export interface SetupApplyResult {
  success: boolean;
  message: string;
  created?: string[];
  details?: string;
}

export interface SSEEvent {
  type: "backlog" | "tasks" | "sprint" | "agents";
  data: BacklogItem[] | Task[] | Sprint | Sprint[] | AgentState[] | null;
}
