import { NextResponse } from "next/server";
import fs from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import type { AcpCheckResult, AgileConfig } from "@/lib/types";

const HOME = os.homedir();

/** Build PATH that includes common npm/nvm global bin locations.
 *  Result is cached at module level — the execSync only runs once per server
 *  lifetime so it never blocks the event loop on subsequent requests.
 */
let _cachedEnhancedPath: string | null = null;
function buildEnhancedPath(): string {
  if (_cachedEnhancedPath) return _cachedEnhancedPath;

  const base = process.env.PATH ?? "";
  let npmGlobalBin = "";
  try {
    const prefix = execSync("npm config get prefix", {
      encoding: "utf-8",
      timeout: 3_000,
      env: { ...process.env, PATH: `${base}:/usr/local/bin:/opt/homebrew/bin` },
    }).trim();
    if (prefix) npmGlobalBin = path.join(prefix, "bin");
  } catch {
    /* ignore */
  }

  _cachedEnhancedPath = [
    base,
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    npmGlobalBin,
    path.join(HOME, ".npm-global", "bin"),
    path.join(HOME, ".local", "bin"),
    path.join(HOME, "bin"),
  ]
    .filter(Boolean)
    .join(":");

  return _cachedEnhancedPath;
}
const OPENCLAW_JSON = path.join(HOME, ".openclaw", "openclaw.json");
const PROJECT_ROOT = path.resolve(process.cwd(), "..");
const AGILE_CONFIG = path.join(PROJECT_ROOT, "openclaw", "agile-config.json");

const AGENT_SOUL_PATHS: Record<string, { src: string; runtime: string }> = {
  "developer-1": {
    src: path.join(
      PROJECT_ROOT,
      "openclaw",
      "workspaces",
      "developer-1",
      "SOUL.md",
    ),
    runtime: path.join(HOME, ".openclaw", "workspace-developer-1", "SOUL.md"),
  },
  "developer-2": {
    src: path.join(
      PROJECT_ROOT,
      "openclaw",
      "workspaces",
      "developer-2",
      "SOUL.md",
    ),
    runtime: path.join(HOME, ".openclaw", "workspace-developer-2", "SOUL.md"),
  },
  "designer-1": {
    src: path.join(
      PROJECT_ROOT,
      "openclaw",
      "workspaces",
      "designer-1",
      "SOUL.md",
    ),
    runtime: path.join(HOME, ".openclaw", "workspace-designer-1", "SOUL.md"),
  },
  "tester-1": {
    src: path.join(
      PROJECT_ROOT,
      "openclaw",
      "workspaces",
      "tester-1",
      "SOUL.md",
    ),
    runtime: path.join(HOME, ".openclaw", "workspace-tester-1", "SOUL.md"),
  },
  sm: {
    src: path.join(PROJECT_ROOT, "openclaw", "workspaces", "sm", "SOUL.md"),
    runtime: path.join(HOME, ".openclaw", "workspace-sm", "SOUL.md"),
  },
};

async function readAgileConfig(): Promise<AgileConfig> {
  try {
    const raw = await fs.readFile(AGILE_CONFIG, "utf-8");
    return JSON.parse(raw) as AgileConfig;
  } catch {
    return {
      workareaPath: path.join(PROJECT_ROOT, "workarea"),
      acp: {
        preferredTool: "claude",
        fallbackTool: "codex",
        toolPriority: ["claude", "codex"],
      },
    };
  }
}

function toolInstalled(name: string): boolean {
  const env = { ...process.env, PATH: buildEnhancedPath() };
  try {
    execSync(`which ${name}`, { stdio: "pipe", env });
    return true;
  } catch {
    /* not in PATH */
  }
  // Check common global bin directories directly
  const dirs = [
    "/usr/local/bin",
    "/opt/homebrew/bin",
    path.join(HOME, ".npm-global", "bin"),
    path.join(HOME, ".local", "bin"),
  ];
  return dirs.some((d) => existsSync(path.join(d, name)));
}

async function acpxEnabled(): Promise<boolean> {
  try {
    const raw = await fs.readFile(OPENCLAW_JSON, "utf-8");
    const d = JSON.parse(raw) as Record<string, unknown>;
    const plugins = (d.plugins ?? {}) as Record<string, unknown>;
    const entries = (plugins.entries ?? {}) as Record<string, unknown>;
    const acpx = (entries.acpx ?? {}) as Record<string, unknown>;
    return acpx.enabled === true;
  } catch {
    return false;
  }
}

async function acpGlobalEnabled(): Promise<boolean> {
  try {
    const raw = await fs.readFile(OPENCLAW_JSON, "utf-8");
    const d = JSON.parse(raw) as Record<string, unknown>;
    const acp = (d.acp ?? {}) as Record<string, unknown>;
    return acp.enabled === true;
  } catch {
    return false;
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";

export async function GET() {
  const [config, acpEnabled, acpEnabledGlobal] = await Promise.all([
    readAgileConfig(),
    acpxEnabled(),
    acpGlobalEnabled(),
  ]);

  const result: AcpCheckResult = {
    acpxInstalled: acpEnabled,
    acpEnabled: acpEnabledGlobal,
    claudeInstalled: toolInstalled("claude"),
    codexInstalled: toolInstalled("codex"),
    workareaPath: config.workareaPath,
    toolPriority: config.acp?.toolPriority ?? ["claude", "codex"],
  };
  return NextResponse.json(result);
}

// ─── POST ─────────────────────────────────────────────────────────────────────

interface ConfigPatch {
  workareaPath?: string;
  toolPriority?: string[];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ConfigPatch;
    const config = await readAgileConfig();
    const oldWorkarea = config.workareaPath;

    // Apply patches
    if (body.workareaPath) config.workareaPath = body.workareaPath;
    if (body.toolPriority && body.toolPriority.length > 0) {
      config.acp.toolPriority = body.toolPriority;
      config.acp.preferredTool = body.toolPriority[0] ?? "claude";
      config.acp.fallbackTool = body.toolPriority[1] ?? "codex";
    }

    // Write agile-config.json
    await fs.writeFile(AGILE_CONFIG, JSON.stringify(config, null, 2), "utf-8");

    // If workarea path changed, update SOUL.md files and openclaw.json cwd
    if (body.workareaPath && body.workareaPath !== oldWorkarea) {
      await updateWorkareaInSouls(oldWorkarea, body.workareaPath);
      await updateOpenclawJsonCwd(body.workareaPath);
    }

    // If tool priority changed, update openclaw.json defaultAgent
    if (body.toolPriority && body.toolPriority.length > 0) {
      await updateDefaultAgent(body.toolPriority[0] ?? "claude");
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

async function updateWorkareaInSouls(oldPath: string, newPath: string) {
  for (const [, paths] of Object.entries(AGENT_SOUL_PATHS)) {
    for (const filePath of [paths.src, paths.runtime]) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        if (content.includes(oldPath)) {
          await fs.writeFile(
            filePath,
            content.replaceAll(oldPath, newPath),
            "utf-8",
          );
        }
      } catch {
        /* file may not exist — ignore */
      }
    }
  }
}

async function updateOpenclawJsonCwd(newWorkarea: string) {
  try {
    const raw = await fs.readFile(OPENCLAW_JSON, "utf-8");
    const d = JSON.parse(raw) as Record<string, unknown>;
    const agents = ((d.agents as Record<string, unknown>) ?? {}).list as Array<
      Record<string, unknown>
    >;
    if (!Array.isArray(agents)) return;
    let changed = false;
    for (const agent of agents) {
      const runtime = agent.runtime as Record<string, unknown> | undefined;
      const acp = (runtime?.acp ?? {}) as Record<string, unknown>;
      if (acp.cwd) {
        acp.cwd = newWorkarea;
        changed = true;
      }
    }
    if (changed) {
      await fs.writeFile(OPENCLAW_JSON, JSON.stringify(d, null, 2), "utf-8");
    }
  } catch {
    /* ignore */
  }
}

async function updateDefaultAgent(tool: string) {
  try {
    const raw = await fs.readFile(OPENCLAW_JSON, "utf-8");
    const d = JSON.parse(raw) as Record<string, unknown>;
    const acp = (d.acp ?? {}) as Record<string, unknown>;
    acp.defaultAgent = tool;
    d.acp = acp;
    await fs.writeFile(OPENCLAW_JSON, JSON.stringify(d, null, 2), "utf-8");
  } catch {
    /* ignore */
  }
}
