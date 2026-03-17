import { NextResponse } from "next/server";
import { readSessionMessages, listSessions } from "@/lib/openclaw-session";

// Team agents route their sessions through SM's sessions_send calls.
// If they have no direct agent directory, fall back to SM's patrol sessions.
const TEAM_AGENT_IDS = new Set([
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? "po";
  const sessionKey = searchParams.get("sessionKey") ?? null;

  // Fast path: sessionKey already known — skip scanning all sessions
  if (sessionKey) {
    const messages = await readSessionMessages(agentId, sessionKey);
    return NextResponse.json({
      agentId,
      sessionKey,
      messages,
      sessions: [],
      fallback: false,
    });
  }

  let sessions = await listSessions(agentId);
  let fallback = false;
  let readFromAgentId = agentId;

  // If team agent has no sessions, fall back to SM's patrol sessions
  if (sessions.length === 0 && TEAM_AGENT_IDS.has(agentId)) {
    const smSessions = await listSessions("sm");
    // Show most recent patrol sessions (cron runs)
    const patrolSessions = smSessions.filter((s) =>
      s.label.startsWith("巡检") || s.key.includes(":cron:")
    );
    if (patrolSessions.length > 0) {
      sessions = patrolSessions.slice(0, 8);
      fallback = true;
      readFromAgentId = "sm";
    }
  }

  const targetKey = sessions[0]?.key ?? null;
  const messages = targetKey
    ? await readSessionMessages(readFromAgentId, targetKey)
    : [];

  return NextResponse.json({
    agentId,
    sessionKey: targetKey,
    messages,
    sessions,
    fallback,
  });
}
