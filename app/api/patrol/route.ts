/**
 * Fast SM patrol session list.
 * Reads only sessions.json — no per-session JSONL file I/O.
 * Used by the SMPatrolLog UI component.
 */
import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");
const PATROL_LIMIT = 30;

// Matches individual cron run sessions: agent:sm:cron:{id}:run:{runId}
const CRON_RUN_PATTERN = /^agent:sm:cron:[^:]+:run:[^:]+$/;

function formatPatrolLabel(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `巡检 ${mm}/${dd} ${hh}:${mi}`;
}

export async function GET() {
  try {
    const sessionsDir = path.join(OPENCLAW_DIR, "agents", "sm", "sessions");
    const raw = await fs.readFile(
      path.join(sessionsDir, "sessions.json"),
      "utf-8",
    );
    const sessionsJson = JSON.parse(raw) as Record<
      string,
      { sessionId: string; updatedAt?: number; label?: string }
    >;

    const sessions = Object.entries(sessionsJson)
      .filter(([key]) => CRON_RUN_PATTERN.test(key))
      .map(([key, entry]) => ({
        key,
        updatedAt: entry.updatedAt ?? 0,
      }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, PATROL_LIMIT)
      .map(({ key, updatedAt }) => {
        const d = new Date(updatedAt);
        return {
          key,
          label: formatPatrolLabel(d),
          latestTimestamp: d.toISOString(),
        };
      });

    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [] });
  }
}
