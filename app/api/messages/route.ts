import { NextResponse } from "next/server";
import { readSessionMessages, listSessions } from "@/lib/openclaw-session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? "po";
  const sessionKey = searchParams.get("sessionKey") ?? null;

  const sessions = await listSessions(agentId);

  // Use provided sessionKey, or fall back to first available session
  const targetKey = sessionKey ?? sessions[0]?.key ?? null;
  const messages = targetKey
    ? await readSessionMessages(agentId, targetKey)
    : [];

  return NextResponse.json({
    agentId,
    sessionKey: targetKey,
    messages,
    sessions,
  });
}
