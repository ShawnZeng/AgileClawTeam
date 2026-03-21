import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import fs from "fs/promises";

const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");
// Use sm's models.json — it is the same global provider registry for all agents
const MODELS_FILE = path.join(
  OPENCLAW_DIR,
  "agents",
  "sm",
  "agent",
  "models.json",
);
const PROJECT_CONFIG = path.resolve(
  process.cwd(),
  "openclaw",
  "openclaw.json",
);
// Runtime config — contains actual effective models for all agents
const RUNTIME_CONFIG = path.join(OPENCLAW_DIR, "openclaw.json");

export interface ModelOption {
  fullId: string; // "provider/model-id"  e.g. "bailian/qwen3-coder-plus"
  name: string;
  provider: string;
  isCode: boolean; // model is code-focused
}

interface ProviderModel {
  id: string;
  name?: string;
  [key: string]: unknown;
}
interface ModelsJson {
  providers: Record<string, { models?: ProviderModel[] }>;
}
interface ProjectConfig {
  agents?: {
    list?: Array<{ id: string; model?: string; [k: string]: unknown }>;
  };
  [k: string]: unknown;
}
type RuntimeModel =
  | string
  | { primary?: string; fallbacks?: string[]; [k: string]: unknown };
interface RuntimeConfig {
  agents?: {
    defaults?: { model?: RuntimeModel; [k: string]: unknown };
    list?: Array<{ id: string; model?: RuntimeModel; [k: string]: unknown }>;
  };
  [k: string]: unknown;
}

function extractPrimary(m: RuntimeModel | undefined): string | undefined {
  if (!m) return undefined;
  if (typeof m === "string") return m;
  return m.primary;
}

// GET /api/agent-models
// Returns { models: ModelOption[], agentModels: Record<agentId, fullModelId> }
export async function GET(): Promise<NextResponse> {
  const models: ModelOption[] = [];
  try {
    const raw = await fs.readFile(MODELS_FILE, "utf-8");
    const data = JSON.parse(raw) as ModelsJson;
    for (const [provider, pdata] of Object.entries(data.providers ?? {})) {
      for (const m of pdata.models ?? []) {
        const fullId = `${provider}/${m.id}`;
        const name = (m.name ?? m.id) as string;
        // A model is "code-focused" if its ID or name contains cod/coder/codex
        const isCode = /\bcod(e|er|ex)/i.test(`${fullId} ${name}`);
        models.push({ fullId, name, provider, isCode });
      }
    }
  } catch {
    // models.json not found — return empty list, not an error
  }

  // Read agentModels from the RUNTIME config (actual effective models)
  const agentModels: Record<string, string> = {};
  try {
    const raw = await fs.readFile(RUNTIME_CONFIG, "utf-8");
    const cfg = JSON.parse(raw) as RuntimeConfig;
    const defaultModel = extractPrimary(cfg.agents?.defaults?.model);
    for (const a of cfg.agents?.list ?? []) {
      const m = extractPrimary(a.model) ?? defaultModel;
      if (m) agentModels[a.id] = m;
    }
  } catch {
    // runtime config not found — fall back to project config
    try {
      const raw = await fs.readFile(PROJECT_CONFIG, "utf-8");
      const cfg = JSON.parse(raw) as ProjectConfig;
      for (const a of cfg.agents?.list ?? []) {
        if (a.model) agentModels[a.id] = a.model;
      }
    } catch {
      // project config also not found
    }
  }

  return NextResponse.json({ models, agentModels });
}

// PATCH /api/agent-models
// Body: { agentId: string, model: string }
// Updates per-agent model in both the runtime and project openclaw.json
export async function PATCH(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as { agentId?: string; model?: string };
  const { agentId, model } = body;
  if (!agentId || !model) {
    return NextResponse.json(
      { success: false, error: "Missing agentId or model" },
      { status: 400 },
    );
  }

  try {
    // Update runtime config (actual effective model)
    try {
      const raw = await fs.readFile(RUNTIME_CONFIG, "utf-8");
      const cfg = JSON.parse(raw) as RuntimeConfig;
      const list = cfg.agents?.list ?? [];
      const idx = list.findIndex((a) => a.id === agentId);
      if (idx >= 0) {
        const existing = list[idx].model;
        if (existing && typeof existing === "object") {
          list[idx] = {
            ...list[idx],
            model: { ...(existing as Record<string, unknown>), primary: model },
          };
        } else {
          list[idx] = { ...list[idx], model: { primary: model } };
        }
        cfg.agents = { ...cfg.agents, list };
        await fs.writeFile(
          RUNTIME_CONFIG,
          JSON.stringify(cfg, null, 2),
          "utf-8",
        );
      }
    } catch {
      // runtime config update failed — not fatal
    }

    // Also update project config
    const raw = await fs.readFile(PROJECT_CONFIG, "utf-8");
    const cfg = JSON.parse(raw) as ProjectConfig;
    const list = cfg.agents?.list ?? [];
    const idx = list.findIndex((a) => a.id === agentId);
    if (idx >= 0) {
      list[idx] = { ...list[idx], model };
    } else {
      list.push({ id: agentId, model });
    }
    cfg.agents = { ...cfg.agents, list };
    await fs.writeFile(PROJECT_CONFIG, JSON.stringify(cfg, null, 2), "utf-8");
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
