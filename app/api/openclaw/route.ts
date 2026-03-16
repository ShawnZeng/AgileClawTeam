import { NextResponse } from "next/server";
import { getGatewayClient, GATEWAY_HTTP_URL } from "@/lib/gateway-ws";
import type { GatewayStatus } from "@/lib/types";

async function httpHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${GATEWAY_HTTP_URL}/health`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const client = getGatewayClient();
  const wsStatus = client.getStatus();

  // HTTP health check gives an authoritative answer on whether gateway is running,
  // independent of WebSocket handshake timing.
  const gatewayRunning = wsStatus.connected || (await httpHealthCheck());

  const status: GatewayStatus = {
    ...wsStatus,
    // Only report "not_started" if HTTP health also fails
    disconnectReason: !gatewayRunning
      ? "not_started"
      : wsStatus.connected
        ? null
        : wsStatus.disconnectReason === "auth_failed"
          ? "auth_failed"
          : wsStatus.disconnectReason === "network_error"
            ? "network_error"
            : null,   // gateway running, WS handshake still in progress → no error
  };

  return NextResponse.json(status);
}
