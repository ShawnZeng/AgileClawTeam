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

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");

const AGENT_IDS = [
  "po",
  "sm",
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
];

const WARM_MS = 5 * 60 * 1000; // <5 min → actively running right now
const RECENT_MS = 30 * 60 * 1000; // <30 min → recently ran

export interface LivenessInfo {
  lastSessionMs: number | null; // Unix ms of most recent session updatedAt
  lastSessionISO: string | null; // ISO string form
  isWarm: boolean; // < 5 min
  isRecent: boolean; // < 30 min
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
      const sessions = JSON.parse(raw) as Record<
        string,
        { updatedAt?: number }
      >;

      const maxUpdatedAt = Math.max(
        0,
        ...Object.values(sessions).map((s) => s.updatedAt ?? 0),
      );
      const lastSessionMs = maxUpdatedAt > 0 ? maxUpdatedAt : null;
      const age = lastSessionMs ? now - lastSessionMs : Infinity;

      result[agentId] = {
        lastSessionMs,
        lastSessionISO: lastSessionMs
          ? new Date(lastSessionMs).toISOString()
          : null,
        isWarm: age < WARM_MS,
        isRecent: age < RECENT_MS,
      };
    } catch {
      result[agentId] = {
        lastSessionMs: null,
        lastSessionISO: null,
        isWarm: false,
        isRecent: false,
      };
    }
  }

  return NextResponse.json(result);
}
