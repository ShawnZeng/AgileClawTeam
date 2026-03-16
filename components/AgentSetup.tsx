"use client";

import { useCallback, useEffect, useState } from "react";
import type { SetupCheckResult, SetupApplyResult } from "@/lib/types";

const MIN_VERSION = "2026.3.12";

interface Props {
  onComplete: () => void;
  autoAdvance?: boolean; // false = show manual "进入 Dashboard" button instead of auto-jumping
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconOk() {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-900 text-green-400 text-xs font-bold shrink-0">
      ✓
    </span>
  );
}
function IconFail() {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-red-900 text-red-400 text-xs font-bold shrink-0">
      ✗
    </span>
  );
}
function IconWarn() {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-900 text-yellow-400 text-xs font-bold shrink-0">
      !
    </span>
  );
}
function IconBlocked() {
  return (
    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-800 text-gray-600 text-xs shrink-0">
      ·
    </span>
  );
}
function IconLoading() {
  return (
    <span className="flex items-center justify-center w-5 h-5 shrink-0">
      <span className="w-3.5 h-3.5 border-2 border-gray-600 border-t-blue-400 rounded-full animate-spin" />
    </span>
  );
}

// ─── Fix guides ────────────────────────────────────────────────────────────────
function InstallGuide() {
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        安装 OpenClaw
      </div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"curl -fsSL https://openclaw.ai/install.sh | bash"}
      </pre>
      <div className="text-xs text-gray-500">安装后初始化：</div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw onboard --install-daemon"}
      </pre>
      <a
        href="https://docs.openclaw.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:text-blue-400"
      >
        查看安装文档 →
      </a>
    </div>
  );
}

function UpgradeGuide({ current }: { current: string | null }) {
  return (
    <div className="mt-4 bg-gray-900 border border-yellow-800/50 rounded-lg p-4 space-y-3">
      <div className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
        版本过低{current ? `（当前 v${current}，需 ≥ ${MIN_VERSION}）` : ""}
      </div>
      <div className="text-xs text-gray-400">运行以下命令升级 OpenClaw：</div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw update"}
      </pre>
      <div className="text-xs text-gray-500">升级后重新打开此页面。</div>
    </div>
  );
}

function GatewayGuide() {
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        启动 Gateway
      </div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw start"}
      </pre>
      <div className="text-xs text-gray-500">验证状态：</div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw status"}
      </pre>
      <div className="text-xs text-gray-500">
        启动后刷新此页面，Dashboard 将自动重新检查连接。
      </div>
    </div>
  );
}

// ─── Check row ────────────────────────────────────────────────────────────────
type RowStatus = "ok" | "fail" | "warn" | "blocked" | "loading";

function CheckRow({
  status,
  label,
  detail,
}: {
  status: RowStatus;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      {status === "ok" && <IconOk />}
      {status === "fail" && <IconFail />}
      {status === "warn" && <IconWarn />}
      {status === "blocked" && <IconBlocked />}
      {status === "loading" && <IconLoading />}
      <div className="flex-1 min-w-0">
        <span
          className={`text-sm font-medium ${
            status === "ok"
              ? "text-gray-200"
              : status === "fail" || status === "warn"
                ? "text-gray-300"
                : "text-gray-500"
          }`}
        >
          {label}
        </span>
      </div>
      <span
        className={`text-xs font-mono ${
          status === "ok"
            ? "text-green-400"
            : status === "fail"
              ? "text-red-400"
              : status === "warn"
                ? "text-yellow-400"
                : "text-gray-600"
        }`}
      >
        {detail}
      </span>
    </div>
  );
}

// ─── Reinstall confirmation modal ────────────────────────────────────────────
function ReinstallDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(10);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div>
          <h3 className="text-lg font-bold text-gray-100">重新注册 Agent</h3>
          <p className="text-sm text-gray-400 mt-2">
            此操作将从 OpenClaw Gateway 中
            <span className="text-red-400 font-medium">删除</span>现有的{" "}
            <code className="font-mono text-yellow-300">po</code> 和{" "}
            <code className="font-mono text-yellow-300">sm</code>{" "}
            Agent，并重新复制 Workspace 文件后重新注册。
          </p>
          <p className="text-xs text-gray-500 mt-2">
            进行中的会话将被中断。请确认后再继续。
          </p>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={seconds > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors min-w-[160px]"
          >
            {seconds > 0 ? `确认重新注册 (${seconds}s)` : "确认重新注册"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AgentSetup({ onComplete, autoAdvance = true }: Props) {
  const [phase, setPhase] = useState<"checking" | "ready" | "creating">(
    "checking",
  );
  const [result, setResult] = useState<SetupCheckResult | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showReinstallDialog, setShowReinstallDialog] = useState(false);
  const [reinstalling, setReinstalling] = useState(false);
  const [reinstallDone, setReinstallDone] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);

  const doCheck = useCallback(async () => {
    setPhase("checking");
    setCreateError(null);
    try {
      const res = await fetch("/api/openclaw-setup");
      const data = (await res.json()) as SetupCheckResult;
      setResult(data);
      if (
        data.cliInstalled &&
        data.cliVersionOk &&
        data.gatewayConnected &&
        data.hasAgents
      ) {
        // Sync gateway config (enables chatCompletions HTTP endpoint) before entering dashboard.
        // This is idempotent — harmless if agents already exist.
        try {
          await fetch("/api/openclaw-setup", { method: "POST" });
        } catch {
          /* ignore */
        }
        if (autoAdvance) {
          onComplete();
          return;
        }
      }
    } catch {
      // leave result null — shows API error state
    }
    setPhase("ready");
  }, [onComplete, autoAdvance]);

  // Initial check on mount
  useEffect(() => {
    void doCheck();
  }, [doCheck]);

  // Auto-poll every 3 s while CLI is ok but gateway isn't connected yet.
  // Stops automatically once connected (or when user is in the middle of creating).
  useEffect(() => {
    if (phase !== "ready") return;
    if (!result?.cliInstalled || !result?.cliVersionOk) return; // CLI issue — no point polling
    if (result?.gatewayConnected) return; // already connected
    const timer = setInterval(() => void doCheck(), 3000);
    return () => clearInterval(timer);
  }, [
    phase,
    result?.cliInstalled,
    result?.cliVersionOk,
    result?.gatewayConnected,
    doCheck,
  ]);

  const doReinstall = async () => {
    setReinstalling(true);
    setCreateError(null);
    setReinstallDone(false);
    try {
      const res = await fetch("/api/openclaw-setup", { method: "PUT" });
      const data = (await res.json()) as SetupApplyResult;
      if (data.success) {
        setReinstallDone(true);
        await doCheck();
      } else {
        setCreateError(
          data.message + (data.details ? `\n${data.details}` : ""),
        );
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "请求失败");
    } finally {
      setReinstalling(false);
    }
  };

  const handleRestart = async () => {
    setRestarting(true);
    setRestartMsg(null);
    try {
      const res = await fetch("/api/openclaw/restart", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      setRestartMsg(
        data.ok ? "重启成功，Gateway 重新上线中…" : `失败：${data.error}`,
      );
      if (data.ok) setReinstallDone(false);
    } catch {
      setRestartMsg("请求失败");
    } finally {
      setRestarting(false);
      setTimeout(() => setRestartMsg(null), 6000);
    }
  };

  const doCreate = async () => {
    setPhase("creating");
    setCreateError(null);
    try {
      const res = await fetch("/api/openclaw-setup", { method: "POST" });
      const data = (await res.json()) as SetupApplyResult;
      if (data.success) {
        onComplete();
      } else {
        setCreateError(
          data.message + (data.details ? `\n${data.details}` : ""),
        );
        setPhase("ready");
      }
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "请求失败");
      setPhase("ready");
    }
  };

  // ── Derive display state ──
  const r = result;
  const isChecking = phase === "checking";

  const cliStatus: RowStatus = isChecking
    ? "loading"
    : !r
      ? "fail"
      : !r.cliInstalled
        ? "fail"
        : !r.cliVersionOk
          ? "warn"
          : "ok";

  const cliDetail = isChecking
    ? "检查中…"
    : !r
      ? "无法检测"
      : !r.cliInstalled
        ? "未安装"
        : !r.cliVersionOk
          ? `v${r.cliVersion ?? "?"} (需 ≥ ${MIN_VERSION})`
          : `v${r.cliVersion ?? "?"}  ✓ 满足 ≥ ${MIN_VERSION}`;

  const cliOk = !isChecking && !!r?.cliInstalled && !!r?.cliVersionOk;

  const gwStatus: RowStatus = isChecking
    ? "loading"
    : !cliOk
      ? "blocked"
      : r?.gatewayConnected
        ? "ok"
        : r?.gatewayRunning
          ? "warn" // process up, WS handshake in progress
          : "fail";

  const gwDetail = isChecking
    ? "检查中…"
    : !cliOk
      ? "需先满足 CLI 条件"
      : r?.gatewayConnected
        ? `已连接 ${r.gatewayAddress ?? ""}`
        : r?.gatewayRunning
          ? `连接中… ${r.gatewayAddress ?? ""}`
          : `未运行 ${r?.gatewayAddress ? `(${r.gatewayAddress})` : ""}`;

  const agentStatus: RowStatus = isChecking
    ? "loading"
    : !cliOk || !r?.gatewayConnected
      ? "blocked"
      : r?.hasAgents
        ? "ok"
        : "warn";

  const agentDetail = isChecking
    ? "检查中…"
    : !cliOk || !r?.gatewayConnected
      ? "需先满足前置条件"
      : r?.hasAgents
        ? "po, sm 已注册"
        : `${r?.missingAgents.join(", ")} 待注册`;

  // Which fix guide to show (first blocker)
  const allGood =
    !isChecking && cliOk && !!r?.gatewayConnected && !!r?.hasAgents;
  const showInstall = !isChecking && !!r && !r.cliInstalled;
  const showUpgrade = !isChecking && !!r && r.cliInstalled && !r.cliVersionOk;
  const showGateway = !isChecking && cliOk && !r?.gatewayRunning;
  const showGatewayConnecting =
    !isChecking && cliOk && !!r?.gatewayRunning && !r?.gatewayConnected;
  const showCreateBtn =
    !isChecking && cliOk && !!r?.gatewayConnected && !r?.hasAgents;

  const canCreate = showCreateBtn && phase !== "creating";

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            AgileAgentsTeam 初始化
          </h1>
          <p className="text-sm text-gray-500 mt-1">请在开始前完成以下检查项</p>
        </div>

        {/* Checklist card */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 divide-y divide-gray-700/60">
          <CheckRow
            status={cliStatus}
            label="OpenClaw CLI"
            detail={cliDetail}
          />
          <CheckRow status={gwStatus} label="Gateway 连接" detail={gwDetail} />
          <CheckRow
            status={agentStatus}
            label="Agent 注册"
            detail={agentDetail}
          />
        </div>

        {/* Install dir (show once we have data) */}
        {r && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>数据目录</span>
            <span className="font-mono text-gray-500">{r.installDir}</span>
          </div>
        )}

        {/* Fix guides — show the first blocker */}
        {showInstall && <InstallGuide />}
        {showUpgrade && <UpgradeGuide current={r?.cliVersion ?? null} />}
        {showGateway && <GatewayGuide />}
        {showGatewayConnecting && (
          <div className="flex items-center gap-3 bg-gray-900 border border-yellow-800/50 rounded-lg px-4 py-3">
            <span className="w-4 h-4 border-2 border-yellow-700 border-t-yellow-400 rounded-full animate-spin shrink-0" />
            <span className="text-sm text-yellow-300">
              Gateway 进程已运行，WebSocket 握手中，请稍候…
            </span>
          </div>
        )}

        {/* Create agents button */}
        {showCreateBtn && (
          <div className="space-y-3">
            {createError && (
              <pre className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded p-3 whitespace-pre-wrap overflow-x-auto">
                {createError}
              </pre>
            )}
            <button
              onClick={() => void doCreate()}
              disabled={!canCreate}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {phase === "creating" && (
                <span className="w-4 h-4 border-2 border-blue-300 border-t-transparent rounded-full animate-spin" />
              )}
              {phase === "creating" ? "正在注册…" : "在 OpenClaw 中注册 Agent"}
            </button>
          </div>
        )}

        {/* All checks passed — action buttons */}
        {allGood && (
          <div className="space-y-3">
            {reinstallDone && (
              <div className="bg-amber-950/50 border border-amber-700/60 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <span className="text-amber-400 text-base leading-none mt-0.5">
                    !
                  </span>
                  <div>
                    <p className="text-sm font-medium text-amber-300">
                      Agent 已重新注册
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Workspace 文件已更新，需要重启 Gateway 使新配置完全生效。
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => void handleRestart()}
                    disabled={restarting}
                    className="px-4 py-2 text-sm font-medium bg-amber-700 hover:bg-amber-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {restarting && (
                      <span className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                    )}
                    {restarting ? "重启中…" : "立即重启 Gateway"}
                  </button>
                  {restartMsg && (
                    <span
                      className={`text-xs ${restartMsg.startsWith("重启成功") ? "text-green-400" : "text-red-400"}`}
                    >
                      {restartMsg}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-3">
              {!autoAdvance && (
                <button
                  onClick={onComplete}
                  className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                >
                  进入 Dashboard →
                </button>
              )}
              <button
                onClick={() => setShowReinstallDialog(true)}
                disabled={reinstalling}
                className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {reinstalling && (
                  <span className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                )}
                {reinstalling ? "重新注册中…" : "重新注册 Agent"}
              </button>
            </div>
          </div>
        )}

        {/* Retry when nothing actionable is shown (e.g. API unreachable) */}
        {!isChecking &&
          !allGood &&
          !showInstall &&
          !showUpgrade &&
          !showGateway &&
          !showCreateBtn && (
            <button
              onClick={() => void doCheck()}
              className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium rounded-lg transition-colors"
            >
              重新检查
            </button>
          )}
      </div>

      {/* Reinstall confirmation dialog */}
      {showReinstallDialog && (
        <ReinstallDialog
          onConfirm={() => {
            setShowReinstallDialog(false);
            void doReinstall();
          }}
          onCancel={() => setShowReinstallDialog(false)}
        />
      )}
    </div>
  );
}
