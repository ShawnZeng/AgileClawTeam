/**
 * Reads chat history directly from OpenClaw's JSONL session transcripts.
 * Session files live at: ~/.openclaw/agents/{agentId}/sessions/{sessionId}.jsonl
 */
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { AgentMessage } from "./types";

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");

export interface SessionInfo {
  key: string;
  label: string;
  msgCount: number;
  latestTimestamp?: string;
  taskId?: string; // populated if this session is for a specific task (label matches TASK-xxx)
}

interface JsonlEntry {
  type: string;
  timestamp: string;
  message?: {
    role: string;
    content: Array<{
      type: string;
      text?: string;
      thinking?: string;
      name?: string;         // toolCall
      arguments?: unknown;   // toolCall
    }>;
  };
}

type SessionsJsonEntry = { sessionId: string; sessionFile?: string; label?: string; updatedAt?: number };

function extractText(content: Array<{ type: string; text?: string }>): string {
  return content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n")
    .trim();
}

/** Strip the "Skills store policy …\n\nACTUAL_MESSAGE" preamble OpenClaw injects. */
function stripPreamble(text: string): string {
  if (text.startsWith("Skills store policy")) {
    const idx = text.lastIndexOf("\n\n");
    if (idx !== -1) return text.slice(idx + 2).trim();
  }
  return text;
}

type ContentBlock = NonNullable<JsonlEntry["message"]>["content"][number];

/**
 * Extract displayable content from an assistant message.
 * Priority: plain text → thinking (reasoning) → tool call summary.
 * Cron/patrol sessions typically have only toolCall + thinking blocks.
 */
function extractAssistantContent(content: ContentBlock[]): string {
  // 1. Plain text blocks (normal chat replies)
  const textContent = content
    .filter((c) => c.type === "text" && c.text)
    .map((c) => c.text!)
    .join("\n")
    .trim();

  // Collect tool names (just the names, not arguments)
  const toolNames = content
    .filter((c) => c.type === "toolCall" && c.name)
    .map((c) => c.name!);

  if (textContent && toolNames.length > 0) {
    // Both text and tool calls — append compact tool indicator
    return `${textContent}\n[🔧 ${toolNames.join(", ")}]`;
  }
  if (textContent) return textContent;

  // 2. Thinking blocks (SM reasoning in cron/patrol sessions)
  const thinking = content
    .filter((c) => c.type === "thinking" && c.thinking)
    .map((c) => c.thinking!)
    .join("\n")
    .trim();
  if (thinking) return thinking;

  // 3. Tool call summary (when SM only invokes tools, no text at all)
  if (toolNames.length > 0) {
    const reads: string[] = [];
    const writes: string[] = [];
    const others: string[] = [];
    for (const tc of content.filter((c) => c.type === "toolCall" && c.name)) {
      const fp = (tc.arguments as { file_path?: string } | undefined)
        ?.file_path;
      const base = fp ? path.basename(fp) : "?";
      if (tc.name === "read") reads.push(base);
      else if (tc.name === "write" || tc.name === "edit") writes.push(base);
      else others.push(tc.name ?? "?");
    }
    const parts: string[] = [];
    if (reads.length > 0) parts.push(`读取: ${reads.join(", ")}`);
    if (writes.length > 0) parts.push(`写入: ${writes.join(", ")}`);
    if (others.length > 0) parts.push(`调用: ${others.join(", ")}`);
    return `[工具调用]\n${parts.join("\n")}`;
  }

  return "";
}

function labelSession(key: string, storedLabel?: string, latestTimestamp?: string): string {
  // Use the stored label from sessions.json if meaningful
  if (storedLabel) {
    // Task-specific session (e.g. label="TASK-001")
    if (/^TASK-\d+/.test(storedLabel)) return `${storedLabel} 工作记录`;
    // Retrospective session
    if (storedLabel === "retrospective") return "Sprint 回顾会";
    // Sprint status notifications
    if (storedLabel === "sprint-status") return "Sprint 状态通知";
    // Generic stored label (e.g. "Cron: Sprint Inspection")
    if (!storedLabel.startsWith("Cron:")) return storedLabel;
  }

  // Fallback: derive from session key
  if (key.endsWith(":openai-user:dashboard-operator")) return "与老板的对话";

  if (/cron:[^:]+:run:[^:]+$/.test(key)) {
    if (latestTimestamp) {
      const d = new Date(latestTimestamp);
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      return `巡检记录 ${mm}/${dd} ${hh}:${mi}`;
    }
    return "巡检记录";
  }

  if (key.endsWith(":main")) return "主会话";

  const parts = key.split(":");
  if (parts.length >= 3) {
    const peer = parts[2];
    if (peer && peer !== "openai-user") return `与 ${peer} 的对话`;
  }

  return key;
}

async function parseJsonlMessages(
  jsonlPath: string,
  agentId: string,
): Promise<AgentMessage[]> {
  const raw = await fs.readFile(jsonlPath, "utf-8");
  const messages: AgentMessage[] = [];

  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as JsonlEntry;
      if (parsed.type !== "message" || !parsed.message) continue;

      const { role, content } = parsed.message;

      let displayText: string;
      if (role === "user") {
        const rawText = extractText(content);
        if (!rawText) continue;
        displayText = stripPreamble(rawText);
      } else if (role === "assistant") {
        displayText = extractAssistantContent(content)
          .replace(/<<BACKLOG_ITEM>>[\s\S]*?<<BACKLOG_ITEM_END>>/g, "")
          .trim();
      } else {
        continue; // skip toolResult and other roles
      }

      if (!displayText) continue;

      messages.push({
        agentId,
        role: role as "user" | "assistant",
        content: displayText,
        timestamp: parsed.timestamp,
      });
    } catch {
      // skip malformed lines
    }
  }

  return messages;
}

export async function readSessionMessages(
  agentId: string,
  sessionKey: string,
): Promise<AgentMessage[]> {
  try {
    const sessionsDir = path.join(OPENCLAW_DIR, "agents", agentId, "sessions");
    const sessionsJson = JSON.parse(
      await fs.readFile(path.join(sessionsDir, "sessions.json"), "utf-8"),
    ) as Record<string, SessionsJsonEntry>;

    const entry = sessionsJson[sessionKey];
    if (!entry) return [];

    // Prefer sessionId-based path (canonical per-run file).
    // sessionFile can be a stale inherited pointer from the parent cron definition.
    const sessionIdPath = path.join(sessionsDir, `${entry.sessionId}.jsonl`);
    let jsonlPath = sessionIdPath;
    try {
      await fs.access(sessionIdPath);
    } catch {
      if (entry.sessionFile) jsonlPath = entry.sessionFile;
      else return [];
    }

    return parseJsonlMessages(jsonlPath, agentId);
  } catch {
    return [];
  }
}

export async function listSessions(agentId: string): Promise<SessionInfo[]> {
  try {
    const sessionsDir = path.join(OPENCLAW_DIR, "agents", agentId, "sessions");
    const sessionsJson = JSON.parse(
      await fs.readFile(path.join(sessionsDir, "sessions.json"), "utf-8"),
    ) as Record<string, SessionsJsonEntry>;

    const infos: SessionInfo[] = [];

    for (const [key, entry] of Object.entries(sessionsJson)) {
      try {
        // Prefer sessionId path; fall back to sessionFile (which can be stale)
        const sessionIdPath = path.join(
          sessionsDir,
          `${entry.sessionId}.jsonl`,
        );
        let jsonlPath = sessionIdPath;
        try {
          await fs.access(sessionIdPath);
        } catch {
          if (entry.sessionFile) jsonlPath = entry.sessionFile;
          else continue;
        }
        const raw = await fs.readFile(jsonlPath, "utf-8");
        const lines = raw.split("\n").filter((l) => l.trim());

        let msgCount = 0;
        let latestTimestamp: string | undefined;

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as JsonlEntry;
            if (parsed.type === "message" && parsed.message) {
              const { role } = parsed.message;
              if (role === "user" || role === "assistant") {
                msgCount++;
                if (!latestTimestamp || parsed.timestamp > latestTimestamp) {
                  latestTimestamp = parsed.timestamp;
                }
              }
            }
          } catch {
            /* skip */
          }
        }

        if (msgCount > 0) {
          const storedLabel = entry.label;
          const taskId = storedLabel && /^TASK-\d+/.test(storedLabel) ? storedLabel : undefined;
          infos.push({
            key,
            label: labelSession(key, storedLabel, latestTimestamp),
            msgCount,
            latestTimestamp,
            taskId,
          });
        }
      } catch {
        /* skip this session */
      }
    }

    // Sort: dashboard-operator first, then task sessions newest-first, then others newest-first
    infos.sort((a, b) => {
      const aIsMain = a.key.endsWith(":openai-user:dashboard-operator");
      const bIsMain = b.key.endsWith(":openai-user:dashboard-operator");
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
      // Task sessions before non-task sessions
      const aIsTask = !!a.taskId;
      const bIsTask = !!b.taskId;
      if (aIsTask && !bIsTask) return -1;
      if (!aIsTask && bIsTask) return 1;
      // Newest first
      if (a.latestTimestamp && b.latestTimestamp) {
        return b.latestTimestamp.localeCompare(a.latestTimestamp);
      }
      return 0;
    });

    return infos;
  } catch {
    return [];
  }
}

/** Convenience: read the dashboard-operator session (used by POChatPanel). */
export async function readAgentMessages(
  agentId: string,
): Promise<AgentMessage[]> {
  const sessionKey = `agent:${agentId}:openai-user:dashboard-operator`;
  return readSessionMessages(agentId, sessionKey);
}
