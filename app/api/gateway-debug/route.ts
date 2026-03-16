import { NextResponse } from "next/server";
import { getGatewayClient } from "@/lib/gateway-ws";

async function tryRpc(
  method: string,
  params: Record<string, unknown>,
): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  const client = getGatewayClient();
  try {
    const result = await client.callRpc(method, params);
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const client = getGatewayClient();
  const status = client.getStatus();

  const results: Record<string, unknown> = {
    gatewayStatus: status,
    webchatSessionKey: client.getWebchatSessionKey(),
  };

  // Full sessions list (untruncated)
  results["sessions.list"] = await tryRpc("sessions.list", {});

  // Introspection
  results["rpc.describe"] = await tryRpc("rpc.describe", {});
  results["rpc.list"] = await tryRpc("rpc.list", {});

  // chat.history — may reveal session keys
  results["chat.history"] = await tryRpc("chat.history", {});

  return NextResponse.json(results);
}
