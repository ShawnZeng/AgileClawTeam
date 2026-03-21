/**
 * Real-time agent session liveness.
 * Reads sessions.json for each agent and returns the most recent `updatedAt`
 * timestamp — written by OpenClaw runtime as the conversation runs.
 * This is the true source of truth for whether an agent is actively processing,
 * not the self-reported `status` in agents.json.
 */
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import type {
  AgentConversationState,
  ConversationKind,
  LivenessInfo,
} from "@/lib/types";

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");

const AGENT_IDS = [
  "po",
  "sm",
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
];

const ACTIVE_MS = 15 * 1000; // <=15s means the agent is still in a live LLM/tool turn
const WARM_MS = 5 * 60 * 1000; // <5 min → recently active
const TALKING_MS = 60 * 1000; // <=60s from last inbound user/peer message keeps talking indicator on
const RECENT_MS = 30 * 60 * 1000; // <30 min → recently ran

interface SessionEntry {
  sessionId?: string;
  updatedAt?: number;
  label?: string;
  systemSent?: boolean;
}

function transcriptPath(agentId: string, sessionId: string): string {
  return path.join(
    OPENCLAW_DIR,
    "agents",
    agentId,
    "sessions",
    `${sessionId}.jsonl`,
  );
}

function classifySessionKind(
  agentId: string,
  sessionKey: string,
): ConversationKind {
  if (sessionKey.startsWith(`agent:${agentId}:cron:`)) return "cron";
  if (sessionKey === `agent:${agentId}:main`) return "human";
  if (sessionKey.startsWith(`agent:${agentId}:openai-user:`)) return "human";
  if (sessionKey.startsWith(`agent:${agentId}:session:`)) return "agent";
  return "unknown";
}

function inferHumanPeerLabel(sessionKey: string): string | null {
  if (sessionKey.includes(":openai-user:")) return "用户";
  if (sessionKey.endsWith(":main")) return "用户";
  return null;
}

async function readLatestInboundMs(filePath: string): Promise<number | null> {
  const raw = await fs.readFile(filePath, "utf-8");
  const lines = raw.trim().split("\n");

  for (let index = lines.length - 1; index >= 0; index--) {
    const line = lines[index]?.trim();
    if (!line) continue;
    try {
      const record = JSON.parse(line) as {
        timestamp?: string;
        message?: { role?: string };
      };
      if (record.message?.role !== "user") continue;
      if (!record.timestamp) continue;
      const parsed = Date.parse(record.timestamp);
      if (Number.isFinite(parsed)) return parsed;
    } catch {
      // ignore malformed JSONL lines
    }
  }

  return null;
}

async function deriveConversationState(
  agentId: string,
  sessions: Record<string, SessionEntry>,
  now: number,
): Promise<AgentConversationState> {
  const candidates = Object.entries(sessions)
    .filter(([, entry]) => {
      const updatedAt = entry.updatedAt ?? 0;
      return updatedAt > 0 && now - updatedAt < TALKING_MS;
    })
    .sort((a, b) => (b[1].updatedAt ?? 0) - (a[1].updatedAt ?? 0));

  let best: AgentConversationState = {
    sessionKey: null,
    kind: null,
    peerLabel: null,
    lastInboundMs: null,
    lastInboundISO: null,
    isTalkingNow: false,
  };

  for (const [sessionKey, entry] of candidates) {
    const sessionId = entry.sessionId;
    if (!sessionId) continue;

    const kind = classifySessionKind(agentId, sessionKey);
    if (kind === "cron") continue;

    try {
      const lastInboundMs = await readLatestInboundMs(
        transcriptPath(agentId, sessionId),
      );
      if (!lastInboundMs) continue;
      const isTalkingNow = now - lastInboundMs < TALKING_MS;
      if (!isTalkingNow) continue;
      if ((best.lastInboundMs ?? 0) >= lastInboundMs) continue;

      best = {
        sessionKey,
        kind,
        peerLabel: kind === "human" ? inferHumanPeerLabel(sessionKey) : null,
        lastInboundMs,
        lastInboundISO: new Date(lastInboundMs).toISOString(),
        isTalkingNow,
      };
    } catch {
      // missing or unreadable transcript: skip this candidate
    }
  }

  return best;
}

export async function GET() {
  const result: Record<string, LivenessInfo> = {};
  const now = Date.now();

  for (const agentId of AGENT_IDS) {
    try {
      const sessionsJsonPath = path.join(
        OPENCLAW_DIR,
        "agents",
        agentId,
        "sessions",
        "sessions.json",
      );
      const raw = await fs.readFile(sessionsJsonPath, "utf-8");
      const sessions = JSON.parse(raw) as Record<string, SessionEntry>;

      const entries = Object.entries(sessions);

      const maxUpdatedAt = Math.max(
        0,
        ...entries.map(([, session]) => session.updatedAt ?? 0),
      );
      const lastSessionMs = maxUpdatedAt > 0 ? maxUpdatedAt : null;
      const age = lastSessionMs ? now - lastSessionMs : Infinity;
      const hasRunningCron = entries.some(([sessionKey, session]) => {
        const updatedAt = session.updatedAt ?? 0;
        return (
          updatedAt > 0 &&
          now - updatedAt < ACTIVE_MS &&
          classifySessionKind(agentId, sessionKey) === "cron"
        );
      });
      const isRunningNow = entries.some(([, session]) => {
        const updatedAt = session.updatedAt ?? 0;
        return updatedAt > 0 && now - updatedAt < ACTIVE_MS;
      });
      const conversation = await deriveConversationState(
        agentId,
        sessions,
        now,
      );

      result[agentId] = {
        lastSessionMs,
        lastSessionISO: lastSessionMs
          ? new Date(lastSessionMs).toISOString()
          : null,
        isWarm: age < WARM_MS,
        isRecent: age < RECENT_MS,
        isRunningNow,
        hasRunningCron,
        conversation,
      };
    } catch {
      result[agentId] = {
        lastSessionMs: null,
        lastSessionISO: null,
        isWarm: false,
        isRecent: false,
        isRunningNow: false,
        hasRunningCron: false,
        conversation: {
          sessionKey: null,
          kind: null,
          peerLabel: null,
          lastInboundMs: null,
          lastInboundISO: null,
          isTalkingNow: false,
        },
      };
    }
  }

  return NextResponse.json(result);
}
