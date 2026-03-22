import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs";
import { execSync } from "child_process";
import { getGatewayClient, GATEWAY_HTTP_URL } from "@/lib/gateway-ws";
import type { SetupCheckResult, SetupApplyResult } from "@/lib/types";

const INSTALL_DIR = path.join(os.homedir(), ".openclaw");
const OPENCLAW_DIR = path.resolve(process.cwd(), "openclaw");
const REQUIRED_AGENTS = [
  "po",
  "sm",
  "designer-1",
  "developer-1",
  "developer-2",
  "tester-1",
];
const MIN_VERSION = "2026.3.12";

// ─── Agent identity & fallback model ─────────────────────────────────────────
const AGENT_IDENTITY: Record<string, { name: string; emoji: string }> = {
  po: { name: "Product Owner", emoji: "🙎" },
  sm: { name: "Scrum Master", emoji: "🧑‍💼" },
  "designer-1": { name: "Designer", emoji: "🎨" },
  "developer-1": { name: "Developer 1", emoji: "👨‍💻" },
  "developer-2": { name: "Developer 2", emoji: "👨‍💻" },
  "tester-1": { name: "QA Tester", emoji: "🧪" },
};

// ─── Version helpers ──────────────────────────────────────────────────────────
function parseVer(v: string): [number, number, number] {
  const p = v.split(".").map(Number);
  return [p[0] ?? 0, p[1] ?? 0, p[2] ?? 0];
}

function versionGte(v: string, min: string): boolean {
  const [va, vb, vc] = parseVer(v);
  const [ma, mb, mc] = parseVer(min);
  if (va !== ma) return va > ma;
  if (vb !== mb) return vb > mb;
  return vc >= mc;
}

function checkCli(): {
  installed: boolean;
  version: string | null;
  versionOk: boolean;
} {
  try {
    const out = execSync("openclaw --version 2>&1", {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    const match = out.match(/(\d{4}\.\d+\.\d+)/);
    const version = match?.[1] ?? null;
    return {
      installed: true,
      version,
      versionOk: version ? versionGte(version, MIN_VERSION) : false,
    };
  } catch {
    return { installed: false, version: null, versionOk: false };
  }
}

// Same HTTP health check used by /api/openclaw
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

// ─── Agent config types ───────────────────────────────────────────────────────
interface AgentIdentity {
  name?: string;
  emoji?: string;
  theme?: string;
  avatar?: string;
}

interface AgentDef {
  id: string;
  workspace: string;
  model: string;
  identity?: AgentIdentity;
  [key: string]: unknown;
}

interface OpenclawConfig {
  agents?: {
    list?: AgentDef[];
    defaults?: {
      model?: string;
      subagents?: Record<string, unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  cron?: Record<string, unknown>;
  [key: string]: unknown;
}

// ─── Project config helpers ───────────────────────────────────────────────────
function readProjectAgentModels(): Map<string, string> {
  try {
    const raw = fs.readFileSync(
      path.join(OPENCLAW_DIR, "openclaw.json"),
      "utf-8",
    );
    const cfg = JSON.parse(raw) as OpenclawConfig;
    return new Map((cfg.agents?.list ?? []).map((a) => [a.id, a.model]));
  } catch {
    return new Map();
  }
}

/** Read channel bindings from the project openclaw.json */
function readProjectBindings(): Array<Record<string, unknown>> {
  try {
    const raw = fs.readFileSync(
      path.join(OPENCLAW_DIR, "openclaw.json"),
      "utf-8",
    );
    const cfg = JSON.parse(raw) as OpenclawConfig;
    return (cfg.bindings as Array<Record<string, unknown>> | undefined) ?? [];
  } catch {
    return [];
  }
}

/**
 * Upsert bindings: keep all existing runtime bindings, then append any
 * project-defined binding whose (agentId + match) pair doesn't already exist.
 */
function mergeBindings(
  existing: Array<Record<string, unknown>>,
  fromProject: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  const result = [...existing];
  for (const pb of fromProject) {
    const duplicate = existing.some(
      (e) =>
        e.agentId === pb.agentId &&
        JSON.stringify(e.match) === JSON.stringify(pb.match),
    );
    if (!duplicate) result.push(pb);
  }
  return result;
}

/**
 * Create ~/.openclaw/workspace-{id} and copy workspace files from the project.
 * Returns the absolute destination path.
 */
function prepareWorkspace(agentId: string): string {
  const dest = path.join(INSTALL_DIR, `workspace-${agentId}`);
  const src = path.join(OPENCLAW_DIR, "workspaces", agentId);

  try {
    fs.mkdirSync(dest, { recursive: true });
    // Copy all .md files from the project workspace, overwriting any existing files.
    if (fs.existsSync(src)) {
      for (const file of fs.readdirSync(src)) {
        if (file.endsWith(".md")) {
          fs.copyFileSync(path.join(src, file), path.join(dest, file));
        }
      }
    }
  } catch {
    // best-effort — workspace dir may already exist and be populated
  }

  return dest;
}

/** Read agents.defaults.subagents from the project openclaw.json */
function readProjectSubagentDefaults(): Record<string, unknown> | undefined {
  try {
    const raw = fs.readFileSync(
      path.join(OPENCLAW_DIR, "openclaw.json"),
      "utf-8",
    );
    const cfg = JSON.parse(raw) as OpenclawConfig;
    return cfg.agents?.defaults?.subagents as
      | Record<string, unknown>
      | undefined;
  } catch {
    return undefined;
  }
}

/** Read per-agent subagents config from the project openclaw.json */
function readProjectAgentSubagents(): Map<string, Record<string, unknown>> {
  try {
    const raw = fs.readFileSync(
      path.join(OPENCLAW_DIR, "openclaw.json"),
      "utf-8",
    );
    const cfg = JSON.parse(raw) as OpenclawConfig;
    const map = new Map<string, Record<string, unknown>>();
    for (const a of cfg.agents?.list ?? []) {
      const sub = (a as Record<string, unknown>).subagents;
      if (sub) map.set(a.id, sub as Record<string, unknown>);
    }
    return map;
  } catch {
    return new Map();
  }
}

const SPRINT_INSPECTION_JOB_ID = "c7a3f891-d2b4-4e56-8f0a-1b2c3d4e5f67";

/** Rotating backup — bak (newest) … bak.4 (oldest), max 5 files. */
function backupRuntimeConfig(config: OpenclawConfig): void {
  try {
    const base = path.join(INSTALL_DIR, "openclaw.json.bak");
    const MAX = 4; // highest suffix kept; bak.4 is dropped on next rotation
    // Shift existing backups: bak.3→bak.4, bak.2→bak.3, bak.1→bak.2
    for (let i = MAX - 1; i >= 1; i--) {
      const from = `${base}.${i}`;
      const to = `${base}.${i + 1}`;
      if (fs.existsSync(from)) fs.renameSync(from, to);
    }
    // bak → bak.1
    if (fs.existsSync(base)) fs.renameSync(base, `${base}.1`);
    // write newest
    fs.writeFileSync(base, JSON.stringify(config, null, 2), "utf-8");
  } catch {
    // best-effort — don't abort setup if backup fails
  }
}

/**
 * Upsert the Sprint Inspection cron job into ~/.openclaw/cron/jobs.json.
 * backlog.json lives in PO's workspace; sprint/tasks/agents live in SM's workspace.
 */
/** Returns true when there is real work for the SM to process. */
function hasActiveWork(): boolean {
  try {
    const backlogFile = path.join(
      INSTALL_DIR,
      "workspace-po",
      "state",
      "backlog.json",
    );
    const sprintFile = path.join(
      INSTALL_DIR,
      "workspace-sm",
      "state",
      "sprint.json",
    );

    interface BacklogEntry {
      status: string;
      sprintId?: string | null;
    }
    interface SprintEntry {
      status: string;
    }
    interface SprintStore {
      sprints?: SprintEntry[];
    }

    // Check for unplanned backlog items
    if (fs.existsSync(backlogFile)) {
      const backlog = JSON.parse(
        fs.readFileSync(backlogFile, "utf-8"),
      ) as BacklogEntry[];
      const hasPending = backlog.some(
        (item) => !item.sprintId && item.status !== "done",
      );
      if (hasPending) return true;
    }

    // Check for active sprints
    if (fs.existsSync(sprintFile)) {
      const raw = JSON.parse(fs.readFileSync(sprintFile, "utf-8")) as
        | SprintStore
        | SprintEntry[];
      const sprints: SprintEntry[] = Array.isArray(raw)
        ? raw
        : (raw.sprints ?? []);
      const hasActive = sprints.some(
        (s) => s.status === "planning" || s.status === "execution",
      );
      if (hasActive) return true;
    }

    return false;
  } catch {
    // If we can't read state, err on the side of keeping the cron alive
    return true;
  }
}

function syncSprintInspectionJob(): void {
  const poState = path.join(INSTALL_DIR, "workspace-po", "state");
  const smState = path.join(INSTALL_DIR, "workspace-sm", "state");
  const cronDir = path.join(INSTALL_DIR, "cron");
  const jobsFile = path.join(cronDir, "jobs.json");

  // If there is no pending work, remove the cron (if present) and skip.
  if (!hasActiveWork()) {
    try {
      if (fs.existsSync(jobsFile)) {
        interface JobsStore {
          version: number;
          jobs: Record<string, unknown>[];
        }
        const store = JSON.parse(
          fs.readFileSync(jobsFile, "utf-8"),
        ) as JobsStore;
        const before = store.jobs.length;
        store.jobs = store.jobs.filter(
          (j) => j.id !== SPRINT_INSPECTION_JOB_ID,
        );
        if (store.jobs.length !== before) {
          fs.writeFileSync(jobsFile, JSON.stringify(store, null, 2), "utf-8");
        }
      }
    } catch {
      // best-effort
    }
    return;
  }

  const jobCore: Record<string, unknown> = {
    id: SPRINT_INSPECTION_JOB_ID,
    name: "Sprint Inspection",
    description: "每 10 分钟巡检 Backlog / Sprint / Tasks，自动规划或派发任务",
    agentId: "sm",
    enabled: true,
    deleteAfterRun: false,
    schedule: { kind: "cron", expr: "*/10 * * * *", tz: "Asia/Shanghai" },
    sessionTarget: "isolated",
    wakeMode: "next-heartbeat",
    payload: {
      kind: "agentTurn",
      message:
        `执行巡检：1) 读取 ${poState}/backlog.json，检查是否有 sprintId=null 且 status 不为 done 的 Item；` +
        `如有且当前无活跃 Sprint（status=planning 或 execution），立即执行 Sprint 规划（参见 SOUL.md Sprint 自主启动章节）；` +
        `2) 读取 ${smState}/tasks.json 和 ${smState}/sprint.json，检查所有任务状态，` +
        `更新阻塞的 agent，派发待派发任务，更新 ${smState}/agents.json`,
    },
    delivery: { mode: "none" },
  };

  try {
    fs.mkdirSync(cronDir, { recursive: true });
    interface JobsStore {
      version: number;
      jobs: Record<string, unknown>[];
    }
    let store: JobsStore = { version: 1, jobs: [] };
    if (fs.existsSync(jobsFile)) {
      store = JSON.parse(fs.readFileSync(jobsFile, "utf-8")) as JobsStore;
    }
    const idx = store.jobs.findIndex((j) => j.id === SPRINT_INSPECTION_JOB_ID);
    const existing = idx >= 0 ? store.jobs[idx] : null;
    const now = Date.now();
    const updated: Record<string, unknown> = {
      ...jobCore,
      createdAtMs: (existing?.createdAtMs as number | undefined) ?? now,
      updatedAtMs: now,
      // preserve runtime state (lastRunAtMs, consecutiveErrors, etc.)
      ...(existing?.state ? { state: existing.state } : {}),
    };
    if (idx >= 0) store.jobs[idx] = updated;
    else store.jobs.push(updated);
    fs.writeFileSync(jobsFile, JSON.stringify(store, null, 2), "utf-8");
  } catch {
    // best-effort
  }
}

export async function GET(): Promise<NextResponse> {
  const cli = checkCli();

  const result: SetupCheckResult = {
    cliInstalled: cli.installed,
    cliVersion: cli.version,
    cliVersionOk: cli.versionOk,
    gatewayRunning: false,
    gatewayConnected: false,
    gatewayAddress: getGatewayClient().getStatus().address,
    hasAgents: false,
    missingAgents: REQUIRED_AGENTS,
    installDir: INSTALL_DIR,
  };

  if (!cli.installed || !cli.versionOk) {
    return NextResponse.json(result);
  }

  const client = getGatewayClient();
  const wsConnected = client.getStatus().connected;
  result.gatewayRunning = wsConnected || (await httpHealthCheck());
  result.gatewayConnected = wsConnected;

  if (!wsConnected) {
    return NextResponse.json(result);
  }

  try {
    const payload = await client.callRpc("config.get", {});
    const cfg = payload.config as OpenclawConfig | undefined;
    const existingIds = (cfg?.agents?.list ?? []).map((a) => a.id);
    result.missingAgents = REQUIRED_AGENTS.filter(
      (id) => !existingIds.includes(id),
    );
    result.hasAgents = result.missingAgents.length === 0;
  } catch (err) {
    result.error = err instanceof Error ? err.message : "Unknown error";
  }

  return NextResponse.json(result);
}

// ─── POST /api/openclaw-setup ────────────────────────────────────────────────
export async function POST(): Promise<NextResponse> {
  const fail = (message: string, details?: string): NextResponse =>
    NextResponse.json(
      { success: false, message, details } as SetupApplyResult,
      { status: 400 },
    );

  const client = getGatewayClient();
  if (!client.getStatus().connected) {
    return fail("Gateway 未连接，请先确保 OpenClaw Gateway 正在运行");
  }

  let currentConfig: OpenclawConfig;
  let hash: string;
  try {
    const payload = await client.callRpc("config.get", {});
    currentConfig = (payload.config as OpenclawConfig | undefined) ?? {};
    hash = (payload.hash as string | undefined) ?? "";
  } catch (err) {
    return fail(
      "无法读取 Gateway 配置",
      err instanceof Error ? err.message : undefined,
    );
  }

  // Model priority: gateway agents.defaults.model > project config per-agent > hardcoded
  const defaultModel = currentConfig.agents?.defaults?.model;
  const projectModels = readProjectAgentModels();
  const projectAgentSubagents = readProjectAgentSubagents();
  const subagentDefaults = readProjectSubagentDefaults();

  const existingList: AgentDef[] = currentConfig.agents?.list ?? [];
  const existingIds = existingList.map((a) => a.id);

  const toAdd: AgentDef[] = REQUIRED_AGENTS.filter(
    (id) => !existingIds.includes(id),
  ).map((id) => ({
    id,
    workspace: prepareWorkspace(id),
    model:
      defaultModel ?? projectModels.get(id) ?? "anthropic/claude-sonnet-4-6",
    identity: AGENT_IDENTITY[id],
    ...(projectAgentSubagents.has(id)
      ? { subagents: projectAgentSubagents.get(id) }
      : {}),
  }));

  const mergedConfig: OpenclawConfig = {
    ...currentConfig,
    gateway: {
      ...(currentConfig.gateway as object | undefined),
      http: {
        ...((currentConfig.gateway as Record<string, unknown> | undefined)
          ?.http as object | undefined),
        endpoints: {
          ...((
            (currentConfig.gateway as Record<string, unknown> | undefined)
              ?.http as Record<string, unknown> | undefined
          )?.endpoints as object | undefined),
          chatCompletions: { enabled: true },
        },
      },
    },
    agents: {
      ...(currentConfig.agents as object | undefined),
      ...(subagentDefaults
        ? {
            defaults: {
              ...currentConfig.agents?.defaults,
              subagents: subagentDefaults,
            },
          }
        : {}),
      list: [...existingList, ...toAdd],
    },
    bindings: mergeBindings(
      (currentConfig.bindings as Array<Record<string, unknown>> | undefined) ??
        [],
      readProjectBindings(),
    ),
    cron: { ...(currentConfig.cron ?? {}), enabled: true },
  };

  try {
    backupRuntimeConfig(currentConfig);
    await client.callRpc("config.apply", {
      raw: JSON.stringify(mergedConfig),
      baseHash: hash,
    });
  } catch (err) {
    return fail(
      "应用配置失败",
      err instanceof Error ? err.message : JSON.stringify(err),
    );
  }

  // Sync cron jobs to the gateway cron store file
  syncSprintInspectionJob();

  if (toAdd.length === 0) {
    return NextResponse.json({
      success: true,
      message: "所有 Agent 已存在，配置已同步",
      created: [],
    } as SetupApplyResult);
  }

  return NextResponse.json({
    success: true,
    message: `成功注册 ${toAdd.length} 个 Agent`,
    created: toAdd.map((a) => a.id),
  } as SetupApplyResult);
}

// ─── PUT /api/openclaw-setup  (reinstall: remove then re-register) ────────────
export async function PUT(): Promise<NextResponse> {
  const fail = (message: string, details?: string): NextResponse =>
    NextResponse.json(
      { success: false, message, details } as SetupApplyResult,
      { status: 400 },
    );

  const client = getGatewayClient();
  if (!client.getStatus().connected) {
    return fail("Gateway 未连接，请先确保 OpenClaw Gateway 正在运行");
  }

  let currentConfig: OpenclawConfig;
  let hash: string;
  try {
    const payload = await client.callRpc("config.get", {});
    currentConfig = (payload.config as OpenclawConfig | undefined) ?? {};
    hash = (payload.hash as string | undefined) ?? "";
  } catch (err) {
    return fail(
      "无法读取 Gateway 配置",
      err instanceof Error ? err.message : undefined,
    );
  }

  // Remove existing po / sm entries
  const filteredList = (currentConfig.agents?.list ?? []).filter(
    (a) => !REQUIRED_AGENTS.includes(a.id),
  );

  // Build fresh agent definitions (re-copies workspace files)
  const defaultModel = currentConfig.agents?.defaults?.model;
  const projectModels = readProjectAgentModels();
  const projectAgentSubagentsPut = readProjectAgentSubagents();
  const subagentDefaultsPut = readProjectSubagentDefaults();

  const freshAgents: AgentDef[] = REQUIRED_AGENTS.map((id) => ({
    id,
    workspace: prepareWorkspace(id),
    model:
      defaultModel ?? projectModels.get(id) ?? "anthropic/claude-sonnet-4-6",
    identity: AGENT_IDENTITY[id],
    ...(projectAgentSubagentsPut.has(id)
      ? { subagents: projectAgentSubagentsPut.get(id) }
      : {}),
  }));

  const mergedConfigPut: OpenclawConfig = {
    ...currentConfig,
    gateway: {
      ...(currentConfig.gateway as object | undefined),
      http: {
        ...((currentConfig.gateway as Record<string, unknown> | undefined)
          ?.http as object | undefined),
        endpoints: {
          ...((
            (currentConfig.gateway as Record<string, unknown> | undefined)
              ?.http as Record<string, unknown> | undefined
          )?.endpoints as object | undefined),
          chatCompletions: { enabled: true },
        },
      },
    },
    agents: {
      ...(currentConfig.agents as object | undefined),
      ...(subagentDefaultsPut
        ? {
            defaults: {
              ...currentConfig.agents?.defaults,
              subagents: subagentDefaultsPut,
            },
          }
        : {}),
      list: [...filteredList, ...freshAgents],
    },
    bindings: mergeBindings(
      (currentConfig.bindings as Array<Record<string, unknown>> | undefined) ??
        [],
      readProjectBindings(),
    ),
    cron: { ...(currentConfig.cron ?? {}), enabled: true },
  };

  try {
    backupRuntimeConfig(currentConfig);
    await client.callRpc("config.apply", {
      raw: JSON.stringify(mergedConfigPut),
      baseHash: hash,
    });
  } catch (err) {
    return fail(
      "应用配置失败",
      err instanceof Error ? err.message : JSON.stringify(err),
    );
  }

  // Sync cron jobs to the gateway cron store file
  syncSprintInspectionJob();

  return NextResponse.json({
    success: true,
    message: `已重新注册 ${freshAgents.length} 个 Agent`,
    created: freshAgents.map((a) => a.id),
  } as SetupApplyResult);
}
