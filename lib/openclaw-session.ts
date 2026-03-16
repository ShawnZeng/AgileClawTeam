/**
 * Reads chat history directly from OpenClaw's JSONL session transcripts.
 * Session files live at: ~/.openclaw/agents/{agentId}/sessions/{sessionId}.jsonl
 * The dashboard session key is:  agent:{agentId}:openai-user:dashboard-operator
 */
import fs from "fs/promises";
import path from "path";
import os from "os";
import type { AgentMessage } from "./types";

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");

interface JsonlEntry {
  type: string;
  timestamp: string;
  message?: {
    role: string;
    content: Array<{ type: string; text?: string }>;
  };
}

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

export async function readAgentMessages(
  agentId: string,
): Promise<AgentMessage[]> {
  try {
    const sessionsDir = path.join(OPENCLAW_DIR, "agents", agentId, "sessions");

    type SessionEntry = { sessionId: string; sessionFile?: string };
    const sessionsJson = JSON.parse(
      await fs.readFile(path.join(sessionsDir, "sessions.json"), "utf-8"),
    ) as Record<string, SessionEntry>;

    // The dashboard always sends user:"dashboard-operator" to /v1/chat/completions
    const sessionKey = `agent:${agentId}:openai-user:dashboard-operator`;
    const entry = sessionsJson[sessionKey];
    if (!entry) return [];

    const jsonlPath =
      entry.sessionFile ?? path.join(sessionsDir, `${entry.sessionId}.jsonl`);

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
  } catch {
    return [];
  }
}
