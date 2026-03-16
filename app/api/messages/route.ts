import { NextResponse } from "next/server";
import { readAgentMessages } from "@/lib/openclaw-session";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId") ?? "po";

  const messages = await readAgentMessages(agentId);
  return NextResponse.json({ agentId, messages });
}
