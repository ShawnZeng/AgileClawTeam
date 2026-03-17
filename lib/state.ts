import fs from "fs/promises";
import path from "path";
import os from "os";
import { z } from "zod";
import lockfile from "proper-lockfile";
import type { BacklogItem, Task, Sprint, AgentState } from "./types";

// State is owned by individual agent workspaces, not the project state/ dir.
const OPENCLAW_DIR = path.join(os.homedir(), ".openclaw");
const PO_STATE_DIR = path.join(OPENCLAW_DIR, "workspace-po", "state");
const SM_STATE_DIR = path.join(OPENCLAW_DIR, "workspace-sm", "state");

// SSE watcher monitors both workspace state dirs
export const STATE_DIRS = [PO_STATE_DIR, SM_STATE_DIR];

// Legacy export — kept so any other imports don't break
export const STATE_DIR = SM_STATE_DIR;

// File → workspace mapping
const FILE_PATHS: Record<string, string> = {
  "backlog.json": path.join(PO_STATE_DIR, "backlog.json"),
  "sprint.json": path.join(SM_STATE_DIR, "sprint.json"),
  "tasks.json": path.join(SM_STATE_DIR, "tasks.json"),
  "agents.json": path.join(SM_STATE_DIR, "agents.json"),
};
const statePath = (file: string) =>
  FILE_PATHS[file] ?? path.join(SM_STATE_DIR, file);

// ─── Zod schemas ──────────────────────────────────────────────────────────────
//   nullable() on optional fields because agents write JSON null

const BacklogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.number(),
  status: z.enum(["pending", "in-progress", "done"]),
  acceptanceCriteria: z.array(z.string()),
  taskIds: z.array(z.string()),
  sprintId: z.preprocess((v) => v ?? undefined, z.string().optional()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  itemId: z.string(),
  type: z.enum(["development", "design", "testing", "other"]),
  assigneeId: z.preprocess((v) => v ?? undefined, z.string().optional()),
  // "working" is written by SM/agents in place of "in-progress" — treat as equivalent
  status: z.enum(["pending", "in-progress", "working", "done", "blocked"]),
  dependencies: z.array(z.string()),
  sprintId: z.string(),
  blockerDescription: z.preprocess(
    (v) => v ?? undefined,
    z.string().optional(),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const SprintSchema = z.object({
  id: z.string(),
  number: z.number(),
  goal: z.string(),
  status: z.enum(["planning", "execution", "review", "retrospective", "done"]),
  committedItemIds: z.array(z.string()),
  startedAt: z.preprocess((v) => v ?? undefined, z.string().optional()),
  endedAt: z.preprocess((v) => v ?? undefined, z.string().optional()),
  retrospective: z.preprocess(
    // SM sometimes writes a plain string summary — treat as undefined for the structured schema
    (v) => (v == null || typeof v === "string" ? undefined : v),
    z
      .object({
        keep: z.array(z.string()),
        drop: z.array(z.string()),
        puzzle: z.array(z.string()),
        improvementTaskIds: z.array(z.string()),
      })
      .optional(),
  ),
});

const AgentStateSchema = z.object({
  id: z.string(),
  role: z.enum(["po", "sm", "developer", "designer", "tester"]),
  status: z.enum(["idle", "working", "blocked", "waiting", "offline"]),
  currentTaskId: z.preprocess((v) => v ?? undefined, z.string().optional()),
  talkingTo: z.preprocess((v) => v ?? undefined, z.string().optional()),
  subagentSessionKey: z.preprocess(
    (v) => v ?? undefined,
    z.string().optional(),
  ),
  lastActivity: z.string(),
  lastMessage: z.preprocess((v) => v ?? undefined, z.string().optional()),
});

// ─── Raw read helpers ─────────────────────────────────────────────────────────

async function readRaw(file: string): Promise<unknown> {
  const raw = await fs.readFile(statePath(file), "utf-8");
  return JSON.parse(raw);
}

/** Unwrap {key: [...]} wrapper if needed, otherwise return as-is */
function unwrapArray(data: unknown, key: string): unknown[] {
  if (Array.isArray(data)) return data;
  if (
    data &&
    typeof data === "object" &&
    key in (data as Record<string, unknown>)
  ) {
    const inner = (data as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner;
  }
  return [];
}

async function writeJson<T>(file: string, data: T): Promise<void> {
  const filePath = statePath(file);
  let release: (() => Promise<void>) | null = null;
  try {
    release = await lockfile.lock(filePath, { retries: 3 });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  } finally {
    if (release) await release();
  }
}

// ─── Public read functions ────────────────────────────────────────────────────

export async function readBacklog(): Promise<BacklogItem[]> {
  const data = await readRaw("backlog.json");
  const arr = unwrapArray(data, "items");
  return z.array(BacklogItemSchema).parse(arr);
}

export async function readTasks(): Promise<Task[]> {
  const data = await readRaw("tasks.json");
  const arr = unwrapArray(data, "tasks");
  return z.array(TaskSchema).parse(arr);
}

export async function readSprint(): Promise<Sprint | null> {
  const data = await readRaw("sprint.json");
  // SM writes {"sprints": [...]}; older format may be a single object
  const arr = unwrapArray(data, "sprints");
  if (arr.length === 0) return null;
  // Prefer the currently active sprint, otherwise the most recent
  const active = arr.find((s) => {
    const st = (s as Record<string, unknown>).status;
    return st === "planning" || st === "execution";
  });
  return SprintSchema.parse(active ?? arr[arr.length - 1]);
}

export async function readAllSprints(): Promise<Sprint[]> {
  const data = await readRaw("sprint.json");
  const arr = unwrapArray(data, "sprints");
  if (arr.length === 0) return [];
  const sprints = arr.map((s) => SprintSchema.parse(s));
  // Active sprints first, then by sprint number descending
  const rank = (s: Sprint) =>
    s.status === "execution" || s.status === "planning" ? 0 : 1;
  return sprints.sort((a, b) => rank(a) - rank(b) || b.number - a.number);
}

export async function readAgents(): Promise<AgentState[]> {
  const data = await readRaw("agents.json");
  const arr = unwrapArray(data, "agents");
  return z.array(AgentStateSchema).parse(arr);
}

// ─── Public write functions ───────────────────────────────────────────────────

export async function writeBacklog(data: BacklogItem[]): Promise<void> {
  return writeJson("backlog.json", data);
}

export async function writeTasks(data: Task[]): Promise<void> {
  return writeJson("tasks.json", { tasks: data });
}

export async function writeSprint(data: Sprint): Promise<void> {
  // Read existing sprints, upsert by id
  let existing: unknown[] = [];
  try {
    const raw = await readRaw("sprint.json");
    existing = unwrapArray(raw, "sprints");
  } catch {
    /* first write */
  }
  const idx = existing.findIndex(
    (s) => (s as Record<string, unknown>).id === data.id,
  );
  if (idx >= 0) existing[idx] = data;
  else existing.push(data);
  return writeJson("sprint.json", { sprints: existing });
}

export async function writeAgents(data: AgentState[]): Promise<void> {
  return writeJson("agents.json", { agents: data });
}

export async function readTaskHistory(): Promise<
  Record<string, { status: string; timestamp: string }[]>
> {
  const historyPath = path.join(SM_STATE_DIR, "task-history.json");
  try {
    const raw = await fs.readFile(historyPath, "utf-8");
    return JSON.parse(raw) as Record<
      string,
      { status: string; timestamp: string }[]
    >;
  } catch {
    return {};
  }
}
