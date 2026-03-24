"use client";

import { useEffect, useState } from "react";
import type { GatewayStatus, DisconnectReason } from "@/lib/types";
import { useI18n } from "@/lib/i18n";

function SetupGuide({ status }: { status: GatewayStatus }) {
  const { t } = useI18n();
  const { disconnectReason, address, httpUrl, hasToken } = status;

  const steps: { title: string; code?: string; note?: string }[] = [];

  if (disconnectReason === "not_started") {
    steps.push(
      { title: t("setupGuide.step.checkCli"), code: "openclaw --version" },
      {
        title: t("setupGuide.step.startGateway"),
        code: "openclaw start",
        note: t("setupGuide.step.noteGatewayStart", { url: httpUrl }),
      },
      { title: t("setupGuide.step.verifyHealth"), code: "openclaw doctor" },
    );
  } else if (disconnectReason === "auth_failed") {
    steps.push(
      {
        title: t("setupGuide.step.checkToken"),
        note: t("setupGuide.step.noteTokenPath"),
        code: `# ~/.openclaw/openclaw.json\n{ gateway: { auth: { token: "\${OPENCLAW_GATEWAY_TOKEN}" } } }`,
      },
      {
        title: t("setupGuide.step.configToken"),
        code: `OPENCLAW_GATEWAY_TOKEN=your_token_here`,
        note: t("setupGuide.step.restartDev"),
      },
    );
    if (!hasToken) {
      steps.unshift({
        title: t("setupGuide.step.noDashboardToken"),
        note: t("setupGuide.step.gatewayNeedsAuth"),
      });
    }
  } else {
    steps.push(
      { title: t("setupGuide.step.runDiagnostic"), code: "openclaw doctor" },
      {
        title: t("setupGuide.step.checkAddress"),
        note: t("setupGuide.step.noteAddress", { addr: address }),
        code: `OPENCLAW_GATEWAY_HOST=127.0.0.1\nOPENCLAW_GATEWAY_PORT=18789`,
      },
    );
  }

  return (
    <div className="mt-4 bg-gray-900 border border-yellow-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-yellow-400 text-sm font-semibold">
          {t("setupGuide.badge")}
        </span>
        <span className="text-xs text-yellow-700 bg-yellow-900/40 px-2 py-0.5 rounded">
          {disconnectReason === "not_started"
            ? t("setupGuide.notRunning")
            : disconnectReason === "auth_failed"
              ? t("setupGuide.authFailed")
              : t("setupGuide.connectionError")}
        </span>
      </div>
      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={i} className="flex gap-3">
            <span className="text-yellow-700 text-xs font-mono mt-0.5 shrink-0">
              {i + 1}.
            </span>
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="text-sm text-gray-300">{step.title}</div>
              {step.code && (
                <pre className="text-xs bg-gray-800 border border-gray-700 rounded px-3 py-2 font-mono text-green-400 overflow-x-auto">
                  {step.code}
                </pre>
              )}
              {step.note && (
                <p className="text-xs text-gray-500">{step.note}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 pt-3 border-t border-gray-800 flex items-center gap-2">
        <span className="text-xs text-gray-600">
          {t("setupGuide.autoRetry")}
        </span>
        <a
          href="https://docs.openclaw.ai/gateway/configuration"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:text-blue-400 ml-auto shrink-0"
        >
          {t("setupGuide.docs")}
        </a>
      </div>
    </div>
  );
}

function reasonLabel(
  reason: DisconnectReason | null,
  t: (k: string) => string,
): string {
  switch (reason) {
    case "not_started":
      return t("setupGuide.notRunning");
    case "auth_failed":
      return t("setupGuide.authFailed");
    case "network_error":
      return t("setupGuide.networkError");
    default:
      return t("setupGuide.connecting");
  }
}

export default function OpenclawStatus() {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/openclaw");
        const data = (await res.json()) as GatewayStatus;
        setStatus(data);
        // Only auto-open guide when there's a real error (not just "connecting")
        if (!data.connected && data.disconnectReason !== null)
          setShowGuide(true);
      } catch {
        setStatus(null);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = status?.connected ?? false;
  const isConnecting = !isConnected && status?.disconnectReason === null;
  const hasError = !isConnected && status?.disconnectReason !== null;

  async function handleRestart() {
    setRestarting(true);
    setRestartMsg(null);
    try {
      const res = await fetch("/api/openclaw/restart", { method: "POST" });
      const data = await res.json();
      setRestartMsg(
        data.ok
          ? t("status.restartSuccess")
          : t("status.restartFailed", { error: String(data.error ?? "") }),
      );
    } catch {
      setRestartMsg(t("status.requestFailed"));
    } finally {
      setRestarting(false);
      setTimeout(() => setRestartMsg(null), 5000);
    }
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      {/* Status row */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full shrink-0 ${
              isConnected
                ? "bg-green-500 animate-pulse"
                : isConnecting
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-red-500"
            }`}
          />
          <span className="text-sm font-medium text-gray-300">
            OpenClaw Gateway
          </span>
        </div>

        <div className="text-sm text-gray-400 font-mono">
          {status?.address ?? "ws://127.0.0.1:18789"}
        </div>

        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            isConnected
              ? "bg-green-900 text-green-300"
              : isConnecting
                ? "bg-yellow-900 text-yellow-300"
                : "bg-red-900 text-red-300"
          }`}
        >
          {isConnected
            ? t("gateway.connected")
            : isConnecting
              ? t("gateway.connecting")
              : reasonLabel(status?.disconnectReason ?? null, t)}
        </span>

        {isConnected && status?.version && (
          <span className="text-xs text-gray-500">v{status.version}</span>
        )}
        {isConnected && status?.latencyMs != null && (
          <span className="text-xs text-gray-500">{status.latencyMs}ms</span>
        )}

        {status !== null && (
          <button
            onClick={handleRestart}
            disabled={restarting}
            className="ml-auto text-xs text-gray-500 hover:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed border border-gray-700 hover:border-gray-500 rounded px-2 py-0.5 transition-colors shrink-0"
          >
            {restarting ? t("status.restarting") : t("status.restartGateway")}
          </button>
        )}

        {restartMsg && (
          <span
            className={`text-xs shrink-0 ${restartMsg.startsWith(t("status.restartSuccess").slice(0, 4)) ? "text-green-400" : "text-red-400"}`}
          >
            {restartMsg}
          </span>
        )}

        {hasError && (
          <button
            onClick={() => setShowGuide((v) => !v)}
            className="text-xs text-yellow-500 hover:text-yellow-400 underline shrink-0"
          >
            {showGuide ? t("status.hideGuide") : t("status.showGuide")}
          </button>
        )}
      </div>

      {/* Contextual setup guide — only shown when there's an actionable error */}
      {hasError && showGuide && status && <SetupGuide status={status} />}

      {/* Install dir footer */}
      {status?.installDir && (
        <div className="mt-3 pt-2 border-t border-gray-700/60 flex items-center gap-1.5">
          <span className="text-xs text-gray-600">
            {t("status.installDir")}
          </span>
          <span className="text-xs font-mono text-gray-500">
            {status.installDir}
          </span>
        </div>
      )}
    </div>
  );
}
