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
}

interface JsonlEntry {
  type: string;
  timestamp: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
  };
}

type SessionsJsonEntry = { sessionId: string; sessionFile?: string };

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

function labelSession(key: string, latestTimestamp?: string): string {
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

  // agent:{id}:{peer}:{session_suffix}
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
      if (role !== "user" && role !== "assistant") continue;

      const rawText = extractText(content);
      if (!rawText) continue;

      const displayText =
        role === "user"
          ? stripPreamble(rawText)
          : rawText
              .replace(/<<BACKLOG_ITEM>>[\s\S]*?<<BACKLOG_ITEM_END>>/g, "")
              .trim();

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

    const jsonlPath =
      entry.sessionFile ?? path.join(sessionsDir, `${entry.sessionId}.jsonl`);
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
        const jsonlPath =
          entry.sessionFile ??
          path.join(sessionsDir, `${entry.sessionId}.jsonl`);
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
          infos.push({
            key,
            label: labelSession(key, latestTimestamp),
            msgCount,
            latestTimestamp,
          });
        }
      } catch {
        /* skip this session */
      }
    }

    // Sort: dashboard-operator first, then newest first by timestamp
    infos.sort((a, b) => {
      const aIsMain = a.key.endsWith(":openai-user:dashboard-operator");
      const bIsMain = b.key.endsWith(":openai-user:dashboard-operator");
      if (aIsMain && !bIsMain) return -1;
      if (!aIsMain && bIsMain) return 1;
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
