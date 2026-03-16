import WebSocket from "ws";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import type { GatewayStatus } from "./types";

// ─── Gateway address ─────────────────────────────────────────────────────────
const GATEWAY_HOST = process.env.OPENCLAW_GATEWAY_HOST ?? "127.0.0.1";
const GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT ?? "18789";
export const GATEWAY_WS_URL = `ws://${GATEWAY_HOST}:${GATEWAY_PORT}`;
export const GATEWAY_HTTP_URL = `http://${GATEWAY_HOST}:${GATEWAY_PORT}`;

// ─── Gateway auth token ───────────────────────────────────────────────────────
// Priority: OPENCLAW_GATEWAY_TOKEN env → ~/.openclaw/openclaw.json gateway.auth.token
function readGatewayToken(): string {
  if (process.env.OPENCLAW_GATEWAY_TOKEN) return process.env.OPENCLAW_GATEWAY_TOKEN;
  try {
    const configPath = path.join(os.homedir(), ".openclaw", "openclaw.json");
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<
      string,
      unknown
    >;
    const gwConf = config.gateway as Record<string, unknown> | undefined;
    const authConf = gwConf?.auth as Record<string, unknown> | undefined;
    if (typeof authConf?.token === "string") return authConf.token;
  } catch {
    // config not found or not parseable — token stays empty
  }
  return "";
}

// ─── Device keypair (persisted to avoid re-approval on reconnect) ─────────────
const DEVICE_KEY_FILE = path.resolve(
  process.cwd(),
  "..",
  ".dashboard-device.json"
);

interface DeviceKeys {
  version: number;
  deviceId: string;
  publicKey: string; // base64 of raw 32-byte Ed25519 public key
  privateKey: string; // base64 of raw 32-byte Ed25519 private key (stored as PKCS8)
}

function computeDeviceId(rawPubKey: Buffer): string {
  return crypto.createHash("sha256").update(rawPubKey).digest("hex");
}

function loadDeviceKeys(): DeviceKeys | null {
  try {
    const data = JSON.parse(fs.readFileSync(DEVICE_KEY_FILE, "utf-8")) as DeviceKeys;
    if (data.version === 1 && data.deviceId && data.publicKey && data.privateKey) {
      return data;
    }
  } catch {
    // file missing or corrupt
  }
  return null;
}

function generateAndSaveDeviceKeys(): DeviceKeys {
  const { privateKey: privKey, publicKey: pubKey } =
    crypto.generateKeyPairSync("ed25519");
  // Extract raw 32-byte public key from SPKI DER (last 32 bytes)
  const spkiDer = pubKey.export({ type: "spki", format: "der" }) as Buffer;
  const rawPubKey = spkiDer.slice(-32);
  // Store PKCS8 DER private key for signing
  const pkcs8Der = privKey.export({ type: "pkcs8", format: "der" }) as Buffer;

  const keys: DeviceKeys = {
    version: 1,
    deviceId: computeDeviceId(rawPubKey),
    publicKey: rawPubKey.toString("base64"),
    privateKey: pkcs8Der.toString("base64"),
  };
  try {
    fs.writeFileSync(DEVICE_KEY_FILE, JSON.stringify(keys, null, 2));
  } catch {
    // write failed — use in-memory keys
  }
  return keys;
}

function getDeviceKeys(): DeviceKeys {
  return loadDeviceKeys() ?? generateAndSaveDeviceKeys();
}

// ─── v2 signing payload ───────────────────────────────────────────────────────
const SCOPES = ["operator.admin", "operator.approvals", "operator.pairing"];
const CLIENT_ID = "openclaw-control-ui";
const CLIENT_MODE = "webchat";
const ROLE = "operator";

function buildSignPayload(
  deviceId: string,
  signedAtMs: number,
  token: string,
  nonce: string
): string {
  return [
    "v2",
    deviceId,
    CLIENT_ID,
    CLIENT_MODE,
    ROLE,
    SCOPES.join(","),
    String(signedAtMs),
    token,
    nonce,
  ].join("|");
}

function signPayload(pkcs8B64: string, payload: string): string {
  const privKey = crypto.createPrivateKey({
    key: Buffer.from(pkcs8B64, "base64"),
    format: "der",
    type: "pkcs8",
  });
  return crypto.sign(null, Buffer.from(payload, "utf-8"), privKey).toString("base64");
}

// ─── RPC protocol types ───────────────────────────────────────────────────────
type DisconnectReason =
  | "not_started"    // ECONNREFUSED — gateway likely not running
  | "auth_failed"    // Token mismatch or nonce error
  | "network_error"  // Other
  | null;

interface RpcResponse {
  type: "res";
  id: string;
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

interface GatewayEvent {
  type: "event";
  event: string;
  payload?: Record<string, unknown>;
}

type GatewayFrame = RpcResponse | GatewayEvent | { type: string };

// ─── Gateway client ───────────────────────────────────────────────────────────
class GatewayClient {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connected = false;
  private webchatSessionKey: string | null = null;
  private version: string | null = null;
  private latencyMs: number | null = null;
  private disconnectReason: DisconnectReason = "not_started";
  private pendingRequests: Map<
    string,
    { resolve: (p: Record<string, unknown>) => void; reject: (e: unknown) => void }
  > = new Map();
  private reqCounter = 0;
  private connectTime = 0;
  private storedDeviceToken: string | null = null;
  private deviceKeys: DeviceKeys = getDeviceKeys();
  private gatewayToken: string = readGatewayToken();

  connect() {
    if (this.ws) return;
    this.connectTime = Date.now();
    try {
      this.ws = new WebSocket(GATEWAY_WS_URL, {
        rejectUnauthorized: false,
        headers: {
          // Origin must match the gateway host so it passes origin checks
          Origin: GATEWAY_HTTP_URL,
        },
      });

      this.ws.on("message", (raw: Buffer) => {
        try {
          const frame = JSON.parse(raw.toString()) as GatewayFrame;
          this.handleFrame(frame);
        } catch {
          // ignore parse errors
        }
      });

      this.ws.on("close", () => {
        this.connected = false;
        this.webchatSessionKey = null;
        this.ws = null;
        this.scheduleReconnect();
      });

      this.ws.on("error", (err: Error) => {
        const msg = err.message ?? "";
        if (msg.includes("ECONNREFUSED") || msg.includes("ENOTFOUND")) {
          this.disconnectReason = "not_started";
        } else {
          this.disconnectReason = "network_error";
        }
        this.connected = false;
        this.ws?.terminate();
        this.ws = null;
        this.scheduleReconnect();
      });
    } catch {
      this.disconnectReason = "network_error";
      this.scheduleReconnect();
    }
  }

  private handleFrame(frame: GatewayFrame) {
    if (frame.type === "res") {
      const res = frame as RpcResponse;
      const pending = this.pendingRequests.get(res.id);
      if (pending) {
        this.pendingRequests.delete(res.id);
        res.ok
          ? pending.resolve(res.payload ?? {})
          : pending.reject(
              new Error(
                (res.error as { message?: string })?.message ??
                  JSON.stringify(res.error),
              ),
            );
      }
      return;
    }
    if (frame.type === "event") {
      this.handleEvent(frame as GatewayEvent);
    }
  }

  private handleEvent(evt: GatewayEvent) {
    switch (evt.event) {
      case "connect.challenge":
        this.sendConnect((evt.payload?.nonce as string) ?? "");
        break;
      default:
        break;
    }
  }

  private sendConnect(nonce: string) {
    const id = this.nextId();
    const signedAtMs = Date.now();
    const token = this.gatewayToken;

    const payload = buildSignPayload(
      this.deviceKeys.deviceId,
      signedAtMs,
      token,
      nonce
    );
    const sig = signPayload(this.deviceKeys.privateKey, payload);

    const params: Record<string, unknown> = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: CLIENT_ID,
        version: "dashboard-1.0",
        platform: "node",
        mode: CLIENT_MODE,
        instanceId: "agile-dashboard",
      },
      role: ROLE,
      scopes: SCOPES,
      caps: ["tool-events"],
      device: {
        id: this.deviceKeys.deviceId,
        publicKey: this.deviceKeys.publicKey,
        signature: sig,
        signedAt: signedAtMs,
        nonce,
      },
    };

    // Include auth token (required if gateway has auth.mode=token)
    if (token) {
      params.auth = { token };
    }
    // Include stored deviceToken for reconnects (avoids re-approval)
    if (this.storedDeviceToken) {
      params.auth = { ...(params.auth as object), deviceToken: this.storedDeviceToken };
    }

    // Register pending handler to receive the connect response
    const connectPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Connect timeout"));
        }
      }, 10000);
    });

    this.sendRaw({ type: "req", id, method: "connect", params });

    connectPromise
      .then((p) => {
        this.connected = true;
        this.disconnectReason = null;
        this.latencyMs = Date.now() - this.connectTime;
        this.version =
          (p.server as Record<string, unknown>)?.version as string ??
          (p.protocol as string) ??
          "unknown";
        // Persist deviceToken for faster reconnects
        const authResp = p.auth as Record<string, unknown> | undefined;
        if (authResp?.deviceToken) {
          this.storedDeviceToken = authResp.deviceToken as string;
        }
        // Capture webchat session key — gateway returns it in the connect payload
        const session = p.session as Record<string, unknown> | undefined;
        const chat   = p.chat   as Record<string, unknown> | undefined;
        const key = (
          session?.key ?? session?.sessionKey ??
          chat?.sessionKey ?? chat?.key ??
          p.sessionKey ?? p.chatSessionKey ?? p.key
        ) as string | undefined;
        if (key) this.webchatSessionKey = key;
      })
      .catch((err: unknown) => {
        const code =
          (err as { code?: string })?.code ??
          (err as { message?: string })?.message ??
          "";
        if (
          code.includes("AUTH") ||
          code.includes("TOKEN") ||
          code.includes("NONCE") ||
          code.includes("SIGNATURE") ||
          code.includes("DEVICE")
        ) {
          this.disconnectReason = "auth_failed";
        } else {
          this.disconnectReason = "network_error";
        }
        this.connected = false;
      });
  }

  private nextId(): string {
    return `dashboard-${++this.reqCounter}`;
  }

  private rpc(
    method: string,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("Not connected"));
        return;
      }
      const id = this.nextId();
      this.pendingRequests.set(id, { resolve, reject });
      this.sendRaw({ type: "req", id, method, params });
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("RPC timeout"));
        }
      }, 10000);
    });
  }

  private sendRaw(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // Re-read token on reconnect (in case user updated config)
      this.gatewayToken = readGatewayToken();
      this.connect();
    }, 5000);
  }

  getStatus(): GatewayStatus {
    return {
      address: GATEWAY_WS_URL,
      httpUrl: GATEWAY_HTTP_URL,
      connected: this.connected,
      version: this.version,
      latencyMs: this.latencyMs,
      disconnectReason: this.disconnectReason,
      hasToken: !!this.gatewayToken,
      installDir: path.join(os.homedir(), ".openclaw"),
    };
  }

  async callRpc(
    method: string,
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    return this.rpc(method, params);
  }

  getWebchatSessionKey(): string | null {
    return this.webchatSessionKey;
  }

  async sendToAgent(agentId: string, message: string): Promise<string | null> {
    // Use the OpenAI-compatible HTTP Chat Completions API.
    // This avoids all WebSocket session-key complexity.
    // The gateway routes the request to the target agent via x-openclaw-agent-id.
    // The `user` field creates a stable session so conversation history is maintained.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-openclaw-agent-id": agentId,
    };
    if (this.gatewayToken) {
      headers["Authorization"] = `Bearer ${this.gatewayToken}`;
    }

    const res = await fetch(`${GATEWAY_HTTP_URL}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "openclaw",
        messages: [{ role: "user", content: message }],
        user: "dashboard-operator",
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`HTTP ${res.status}: ${text}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { role?: string; content?: string } }>;
    };

    return data.choices?.[0]?.message?.content ?? null;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
let gatewayClient: GatewayClient | null = null;

export function getGatewayClient(): GatewayClient {
  if (!gatewayClient) {
    gatewayClient = new GatewayClient();
    gatewayClient.connect();
  }
  return gatewayClient;
}
