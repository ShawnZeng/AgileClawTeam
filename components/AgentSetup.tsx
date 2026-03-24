"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  SetupCheckResult,
  SetupApplyResult,
  AcpCheckResult,
} from "@/lib/types";
import { useI18n } from "@/lib/i18n";

const MIN_VERSION = "2026.3.12";

interface Props {
  onComplete: () => void;
  autoAdvance?: boolean; // false = show "← 返回 Dashboard" button instead of auto-jumping
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

// ─── Fix guides ─────────────────────────────────────────────────────────────
function InstallGuide() {
  const { t } = useI18n();
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {t("install.title")}
      </div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"curl -fsSL https://openclaw.ai/install.sh | bash"}
      </pre>
      <div className="text-xs text-gray-500">{t("install.initAfter")}</div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw onboard --install-daemon"}
      </pre>
      <a
        href="https://docs.openclaw.ai"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-500 hover:text-blue-400"
      >
        {t("install.viewDocs")}
      </a>
    </div>
  );
}

function UpgradeGuide({ current }: { current: string | null }) {
  const { t } = useI18n();
  return (
    <div className="mt-4 bg-gray-900 border border-yellow-800/50 rounded-lg p-4 space-y-3">
      <div className="text-xs font-medium text-yellow-400 uppercase tracking-wide">
        {current
          ? t("upgrade.title", { current, min: MIN_VERSION })
          : t("upgrade.titleNoVersion")}
      </div>
      <div className="text-xs text-gray-400">{t("upgrade.runCommand")}</div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw update"}
      </pre>
      <div className="text-xs text-gray-500">{t("upgrade.refreshAfter")}</div>
    </div>
  );
}

function GatewayGuide() {
  const { t } = useI18n();
  return (
    <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">
        {t("gwguide.startTitle")}
      </div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw start"}
      </pre>
      <div className="text-xs text-gray-500">{t("gwguide.verifyStatus")}</div>
      <pre className="text-xs bg-gray-800 rounded px-3 py-2 text-green-400 font-mono overflow-x-auto">
        {"openclaw status"}
      </pre>
      <div className="text-xs text-gray-500">{t("gwguide.refreshAfter")}</div>
    </div>
  );
}

// ─── Check row ───────────────────────────────────────────────────────────────
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

// ─── Section header ──────────────────────────────────────────────────────────
function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="pb-1">
      <h2 className="text-sm font-semibold text-gray-300">{title}</h2>
      {subtitle && <p className="text-xs text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ─── Workarea section ────────────────────────────────────────────────────────
function WorkareaSection() {
  const [loading, setLoading] = useState(true);
  const [workareaPath, setWorkareaPath] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveMsgOk, setSaveMsgOk] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json() as Promise<AcpCheckResult>)
      .then((d) => {
        setWorkareaPath(d.workareaPath ?? "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workareaPath }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      setSaveMsgOk(d.ok);
      setSaveMsg(
        d.ok
          ? t("workarea.saved")
          : t("workarea.saveFailed", { error: d.error ?? "" }),
      );
    } catch {
      setSaveMsgOk(false);
      setSaveMsg(t("workarea.requestFailed"));
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
      <SectionHeader
        title={t("workarea.title")}
        subtitle={t("workarea.subtitle")}
      />
      {loading ? (
        <div className="text-xs text-gray-600">{t("workarea.loading")}</div>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={workareaPath}
            onChange={(e) => setWorkareaPath(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 text-sm text-gray-200 font-mono rounded px-3 py-2 focus:outline-none focus:border-blue-500"
            placeholder="/path/to/workarea"
          />
          <button
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors shrink-0"
          >
            {saving ? t("workarea.saving") : t("workarea.save")}
          </button>
        </div>
      )}
      {saveMsg && (
        <div
          className={`text-xs ${saveMsgOk ? "text-green-400" : "text-red-400"}`}
        >
          {saveMsg}
        </div>
      )}
    </div>
  );
}

// ─── ACP section ─────────────────────────────────────────────────────────────
type ToolId = "acpx" | "claude" | "codex";

function AcpSection() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcpCheckResult | null>(null);
  const [installingTool, setInstallingTool] = useState<ToolId | null>(null);
  const [toolMessages, setToolMessages] = useState<
    Record<string, { ok: boolean; text: string }>
  >({});
  const [needsRestart, setNeedsRestart] = useState(false);
  const [priority, setPriority] = useState<string[]>([]);
  const [savingPriority, setSavingPriority] = useState(false);
  const [priorityMsg, setPriorityMsg] = useState<string | null>(null);
  const [priorityMsgOk, setPriorityMsgOk] = useState(false);
  const { t } = useI18n();

  const TOOL_LABELS: Record<string, string> = {
    claude: "Claude Code",
    codex: "Codex CLI",
  };

  const load = useCallback(async () => {
    try {
      const d = (await fetch("/api/config").then((r) =>
        r.json(),
      )) as AcpCheckResult;
      setData(d);
      setPriority(d.toolPriority ?? ["claude", "codex"]);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const installTool = async (tool: ToolId) => {
    setInstallingTool(tool);
    setToolMessages((prev) => ({ ...prev, [tool]: { ok: true, text: "" } }));
    try {
      let ok = false;
      let errText = t("acp.installFailed");

      if (tool === "acpx") {
        const res = await fetch("/api/config/install-acp", { method: "POST" });
        const d = (await res.json()) as {
          ok: boolean;
          needsRestart?: boolean;
          error?: string;
        };
        ok = d.ok;
        errText = d.error ?? t("acp.installFailed");
        if (d.ok) setNeedsRestart(!!d.needsRestart);
      } else {
        const res = await fetch("/api/config/install-tool", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool }),
        });
        const d = (await res.json()) as { ok: boolean; error?: string };
        ok = d.ok;
        errText = d.error ?? t("acp.installFailed");
      }

      setToolMessages((prev) => ({
        ...prev,
        [tool]: { ok, text: ok ? t("acp.installSuccess") : errText },
      }));

      if (ok) {
        // Refresh from server (updates toolPriority etc.)
        await load();
        // Force installed=true in local state regardless of server PATH check result.
        // (Server-side `which` may miss newly installed binaries in nvm paths.)
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            ...(tool === "acpx" && { acpxInstalled: true }),
            ...(tool === "claude" && { claudeInstalled: true }),
            ...(tool === "codex" && { codexInstalled: true }),
          };
        });
      }
    } catch {
      setToolMessages((prev) => ({
        ...prev,
        [tool]: { ok: false, text: t("acp.requestFailed") },
      }));
    } finally {
      setInstallingTool(null);
    }
  };

  const moveUp = (i: number) => {
    if (i === 0) return;
    const arr = [...priority];
    [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]];
    setPriority(arr);
  };

  const moveDown = (i: number) => {
    if (i === priority.length - 1) return;
    const arr = [...priority];
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    setPriority(arr);
  };

  const savePriority = async () => {
    setSavingPriority(true);
    setPriorityMsg(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolPriority: priority }),
      });
      const d = (await res.json()) as { ok: boolean; error?: string };
      setPriorityMsgOk(d.ok);
      setPriorityMsg(
        d.ok
          ? t("workarea.saved")
          : t("workarea.saveFailed", { error: d.error ?? "" }),
      );
    } catch {
      setPriorityMsgOk(false);
      setPriorityMsg(t("acp.requestFailed"));
    } finally {
      setSavingPriority(false);
      setTimeout(() => setPriorityMsg(null), 3000);
    }
  };

  const toolInstalled = (tool: string) =>
    tool === "claude" ? !!data?.claudeInstalled : !!data?.codexInstalled;

  const toolRows: Array<{ id: ToolId; label: string; installed: boolean }> = [
    {
      id: "acpx",
      label: t("acp.acpxPlugin"),
      installed: !!data?.acpxInstalled,
    },
    { id: "claude", label: "Claude Code", installed: !!data?.claudeInstalled },
    { id: "codex", label: "Codex CLI", installed: !!data?.codexInstalled },
  ];

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
      <SectionHeader title={t("acp.title")} subtitle={t("acp.subtitle")} />
      {loading ? (
        <div className="text-xs text-gray-600">{t("acp.loading")}</div>
      ) : (
        <>
          {/* Per-tool status rows with inline install buttons */}
          <div className="divide-y divide-gray-700/60 -mx-4 px-4">
            {toolRows.map(({ id, label, installed }) => (
              <div key={id} className="py-2.5 space-y-1">
                <div className="flex items-center gap-3">
                  {installed ? <IconOk /> : <IconWarn />}
                  <span
                    className={`text-sm font-medium flex-1 ${installed ? "text-gray-200" : "text-gray-300"}`}
                  >
                    {label}
                  </span>
                  {installed ? (
                    <span className="text-xs font-mono text-green-400">
                      {t("acp.installed")}
                    </span>
                  ) : (
                    <button
                      onClick={() => void installTool(id)}
                      disabled={installingTool !== null}
                      className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      {installingTool === id && (
                        <span className="w-2.5 h-2.5 border border-blue-300 border-t-transparent rounded-full animate-spin" />
                      )}
                      {installingTool === id
                        ? t("acp.installing")
                        : t("acp.install")}
                    </button>
                  )}
                </div>
                {toolMessages[id]?.text && (
                  <div
                    className={`text-xs ml-8 ${toolMessages[id].ok ? "text-green-400" : "text-red-400"}`}
                  >
                    {toolMessages[id].text}
                  </div>
                )}
              </div>
            ))}
          </div>

          {needsRestart && (
            <div className="text-xs text-amber-400">
              {t("acp.needsRestart")}
            </div>
          )}

          {/* Tool priority config — when acpx installed */}
          {data?.acpxInstalled && (
            <div className="space-y-2">
              <div className="text-xs text-gray-500">{t("acp.priority")}</div>
              {priority.map((tool, i) => (
                <div key={tool} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-4 text-right">
                    {i + 1}.
                  </span>
                  <span className="flex-1 text-sm text-gray-300">
                    {TOOL_LABELS[tool] ?? tool}
                    {!toolInstalled(tool) && (
                      <span className="ml-1 text-xs text-yellow-600">
                        {t("acp.notInstalled")}
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="w-6 h-6 text-xs text-gray-500 hover:text-gray-200 disabled:text-gray-700 hover:bg-gray-700 disabled:hover:bg-transparent rounded transition-colors flex items-center justify-center"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === priority.length - 1}
                      className="w-6 h-6 text-xs text-gray-500 hover:text-gray-200 disabled:text-gray-700 hover:bg-gray-700 disabled:hover:bg-transparent rounded transition-colors flex items-center justify-center"
                    >
                      ▼
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => void savePriority()}
                  disabled={savingPriority}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg transition-colors"
                >
                  {savingPriority
                    ? t("acp.savingPriority")
                    : t("acp.savePriority")}
                </button>
                {priorityMsg && (
                  <span
                    className={`text-xs ${priorityMsgOk ? "text-green-400" : "text-red-400"}`}
                  >
                    {priorityMsg}
                  </span>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Reinstall confirmation modal ────────────────────────────────────────────
function ReinstallDialog({
  onConfirm,
  onCancel,
  defaultLang,
}: {
  onConfirm: (lang: "zh" | "en") => void;
  onCancel: () => void;
  defaultLang: "zh" | "en";
}) {
  const [seconds, setSeconds] = useState(10);
  const [selectedLang, setSelectedLang] = useState<"zh" | "en">(defaultLang);
  const { t } = useI18n();

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [seconds]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
        <div>
          <h3 className="text-lg font-bold text-gray-100">
            {t("reinstall.title")}
          </h3>
          <p className="text-sm text-gray-400 mt-2">
            {t("reinstall.bodyPre")}
            <span className="text-red-400 font-medium">
              {t("reinstall.bodyBold")}
            </span>
            {t("reinstall.bodyPost")}
          </p>
          <p className="text-xs text-gray-500 mt-2">{t("reinstall.warning")}</p>
        </div>
        {/* Language picker */}
        <div className="space-y-1.5">
          <div className="text-xs text-gray-400">
            {t("reinstall.langLabel")}
          </div>
          <div className="flex gap-2">
            {(["zh", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setSelectedLang(l)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedLang === l
                    ? "bg-blue-600 border-blue-500 text-white"
                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {t(l === "zh" ? "reinstall.langZh" : "reinstall.langEn")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-300 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t("reinstall.cancel")}
          </button>
          <button
            onClick={() => onConfirm(selectedLang)}
            disabled={seconds > 0}
            className="px-4 py-2 text-sm font-medium text-white bg-red-700 hover:bg-red-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors min-w-[160px]"
          >
            {seconds > 0
              ? t("reinstall.confirmCountdown", { s: String(seconds) })
              : t("reinstall.confirm")}
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
  const [restartMsgOk, setRestartMsgOk] = useState(false);
  const { t, lang } = useI18n();

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
        try {
          await fetch("/api/openclaw-setup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          });
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

  useEffect(() => {
    void doCheck();
  }, [doCheck]);

  useEffect(() => {
    if (phase !== "ready") return;
    if (!result?.cliInstalled || !result?.cliVersionOk) return;
    if (result?.gatewayConnected) return;
    const timer = setInterval(() => void doCheck(), 3000);
    return () => clearInterval(timer);
  }, [
    phase,
    result?.cliInstalled,
    result?.cliVersionOk,
    result?.gatewayConnected,
    doCheck,
  ]);

  const doReinstall = async (reinstallLang: "zh" | "en") => {
    setReinstalling(true);
    setCreateError(null);
    setReinstallDone(false);
    try {
      const res = await fetch("/api/openclaw-setup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang: reinstallLang }),
      });
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
      setCreateError(
        err instanceof Error ? err.message : t("acp.requestFailed"),
      );
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
      setRestartMsgOk(data.ok);
      setRestartMsg(
        data.ok
          ? t("setup.agentsReregistered") +
              " - " +
              t("setup.workspaceUpdated").slice(0, 20) +
              "..."
          : t("status.restartFailed", { error: data.error ?? "" }),
      );
      if (data.ok) setReinstallDone(false);
    } catch {
      setRestartMsgOk(false);
      setRestartMsg(t("status.requestFailed"));
    } finally {
      setRestarting(false);
      setTimeout(() => setRestartMsg(null), 6000);
    }
  };

  const doCreate = async () => {
    setPhase("creating");
    setCreateError(null);
    try {
      const res = await fetch("/api/openclaw-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lang }),
      });
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
      setCreateError(
        err instanceof Error ? err.message : t("acp.requestFailed"),
      );
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
    ? t("setup.checking")
    : !r
      ? t("setup.undetectable")
      : !r.cliInstalled
        ? t("setup.notInstalled")
        : !r.cliVersionOk
          ? t("setup.cliVersionWarn", {
              ver: r.cliVersion ?? "?",
              min: MIN_VERSION,
            })
          : t("setup.cliVersionOk", {
              ver: r.cliVersion ?? "?",
              min: MIN_VERSION,
            });

  const cliOk = !isChecking && !!r?.cliInstalled && !!r?.cliVersionOk;

  const gwStatus: RowStatus = isChecking
    ? "loading"
    : !cliOk
      ? "blocked"
      : r?.gatewayConnected
        ? "ok"
        : r?.gatewayRunning
          ? "warn"
          : "fail";

  const gwDetail = isChecking
    ? t("setup.checking")
    : !cliOk
      ? t("setup.waitingForCli")
      : r?.gatewayConnected
        ? t("setup.gatewayConnected", { addr: r.gatewayAddress ?? "" })
        : r?.gatewayRunning
          ? t("setup.gatewayConnecting", { addr: r.gatewayAddress ?? "" })
          : r?.gatewayAddress
            ? `${t("setup.gatewayNotRunning")} (${r.gatewayAddress})`
            : t("setup.gatewayNotRunning");

  const agentStatus: RowStatus = isChecking
    ? "loading"
    : !cliOk || !r?.gatewayConnected
      ? "blocked"
      : r?.hasAgents
        ? "ok"
        : "warn";

  const agentDetail = isChecking
    ? t("setup.checking")
    : !cliOk || !r?.gatewayConnected
      ? t("setup.waitingForPrereqs")
      : r?.hasAgents
        ? t("setup.agentsInstalled")
        : t("setup.agentsMissing", {
            agents: r?.missingAgents.join(", ") ?? "",
          });

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
    <div className="min-h-screen bg-gray-950 overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {t("setup.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t("setup.subtitle")}</p>
          </div>
          {!autoAdvance && (
            <button
              onClick={onComplete}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors mt-1 shrink-0"
            >
              {t("header.backToDashboard")}
            </button>
          )}
        </div>

        {/* Section 1: 环境检查 */}
        <div className="space-y-2">
          <SectionHeader title={t("setup.envCheck")} />
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 divide-y divide-gray-700/60">
            <CheckRow
              status={cliStatus}
              label="OpenClaw CLI"
              detail={cliDetail}
            />
            <CheckRow status={gwStatus} label="Gateway" detail={gwDetail} />
            <CheckRow status={agentStatus} label="Agent" detail={agentDetail} />
          </div>

          {r && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span>{t("setup.dataDir")}</span>
              <span className="font-mono text-gray-500">{r.installDir}</span>
            </div>
          )}

          {showInstall && <InstallGuide />}
          {showUpgrade && <UpgradeGuide current={r?.cliVersion ?? null} />}
          {showGateway && <GatewayGuide />}
          {showGatewayConnecting && (
            <div className="flex items-center gap-3 bg-gray-900 border border-yellow-800/50 rounded-lg px-4 py-3">
              <span className="w-4 h-4 border-2 border-yellow-700 border-t-yellow-400 rounded-full animate-spin shrink-0" />
              <span className="text-sm text-yellow-300">
                {t("setup.handshaking")}
              </span>
            </div>
          )}

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
                {phase === "creating"
                  ? t("setup.registering")
                  : t("setup.registerAgents")}
              </button>
            </div>
          )}

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
                        {t("setup.agentsReregistered")}
                      </p>
                      <p className="text-xs text-amber-600 mt-0.5">
                        {t("setup.workspaceUpdated")}
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
                      {restarting
                        ? t("setup.restarting")
                        : t("setup.restartGateway")}
                    </button>
                    {restartMsg && (
                      <span
                        className={`text-xs ${restartMsgOk ? "text-green-400" : "text-red-400"}`}
                      >
                        {restartMsg}
                      </span>
                    )}
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowReinstallDialog(true)}
                disabled={reinstalling}
                className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 text-gray-300 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {reinstalling && (
                  <span className="w-4 h-4 border-2 border-gray-500 border-t-gray-300 rounded-full animate-spin" />
                )}
                {reinstalling
                  ? t("setup.reregistering")
                  : t("setup.reregisterAgents")}
              </button>
            </div>
          )}

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
                {t("setup.recheck")}
              </button>
            )}
        </div>

        {/* Section 2: Workarea 目录 */}
        <WorkareaSection />

        {/* Section 3: 编程工具（ACP） */}
        <AcpSection />
      </div>

      {showReinstallDialog && (
        <ReinstallDialog
          defaultLang={lang}
          onConfirm={(reinstallLang) => {
            setShowReinstallDialog(false);
            void doReinstall(reinstallLang);
          }}
          onCancel={() => setShowReinstallDialog(false)}
        />
      )}
    </div>
  );
}
