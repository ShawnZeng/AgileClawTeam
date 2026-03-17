import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";
import { STATE_DIRS, STATE_DIR } from "./state";

// task-history.json lives in the same workspace-sm/state/ dir as tasks.json
const HISTORY_FILE = path.join(STATE_DIR, "task-history.json");
const TASKS_FILE = path.join(STATE_DIR, "tasks.json");

// Normalise "working" to "in-progress" so history doesn't log both variants
function normaliseStatus(s: string): string {
  return s === "working" ? "in-progress" : s;
}

export interface TaskHistoryEntry {
  status: string;
  timestamp: string;
}
export type TaskHistoryMap = Record<string, TaskHistoryEntry[]>;

async function readHistory(): Promise<TaskHistoryMap> {
  try {
    const raw = await fs.readFile(HISTORY_FILE, "utf-8");
    return JSON.parse(raw) as TaskHistoryMap;
  } catch {
    return {};
  }
}

async function writeHistory(h: TaskHistoryMap): Promise<void> {
  await fs.writeFile(HISTORY_FILE, JSON.stringify(h, null, 2), "utf-8");
}

interface RawTask {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

async function readRawTasks(): Promise<RawTask[]> {
  try {
    const raw = await fs.readFile(TASKS_FILE, "utf-8");
    const data = JSON.parse(raw) as unknown;
    const arr: unknown[] = Array.isArray(data)
      ? data
      : Array.isArray((data as Record<string, unknown>)?.tasks)
        ? ((data as Record<string, unknown>).tasks as unknown[])
        : [];
    return arr.filter(
      (t): t is RawTask =>
        typeof t === "object" &&
        t !== null &&
        typeof (t as RawTask).id === "string" &&
        typeof (t as RawTask).status === "string",
    );
  } catch {
    return [];
  }
}

class SSEWatcher extends EventEmitter {
  private watcher: ReturnType<typeof import("chokidar").watch> | null = null;
  private started = false;
  // taskId → normalised status from last snapshot
  private prevStatusMap = new Map<string, string>();

  async start() {
    if (this.started) return;
    this.started = true;

    // Bootstrap: read current tasks and initialise history for any task that
    // has no entry yet (uses task.createdAt as the "pending" timestamp).
    await this.syncTaskHistory();

    const chokidar = await import("chokidar");
    this.watcher = chokidar.watch(STATE_DIRS, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
    });

    this.watcher.on("change", (filePath: string) => {
      const file = path.basename(filePath, ".json");
      const validFiles = ["backlog", "tasks", "sprint", "agents"];
      if (validFiles.includes(file)) {
        if (file === "tasks") {
          this.syncTaskHistory().catch(console.error);
        }
        this.emit("state-change", file);
      }
    });
  }

  private async syncTaskHistory(): Promise<void> {
    const [tasks, history] = await Promise.all([
      readRawTasks(),
      readHistory(),
    ]);

    let dirty = false;

    for (const task of tasks) {
      const norm = normaliseStatus(task.status);
      const entries = history[task.id] ?? [];

      // Ensure the initial "pending" entry exists (seeded from createdAt)
      if (entries.length === 0) {
        entries.push({ status: "pending", timestamp: task.createdAt });
        // If current status is already different from pending, record it too
        if (norm !== "pending") {
          // Use updatedAt as the best-effort timestamp for the transition
          entries.push({ status: norm, timestamp: task.updatedAt });
        }
        history[task.id] = entries;
        this.prevStatusMap.set(task.id, norm);
        dirty = true;
        continue;
      }

      // Detect status change relative to our in-memory snapshot
      const prev = this.prevStatusMap.get(task.id);
      if (prev === undefined) {
        // First time we see this task in this process — just record snapshot
        this.prevStatusMap.set(task.id, norm);
        continue;
      }

      if (prev !== norm) {
        // Status changed — append a new entry timestamped now
        entries.push({ status: norm, timestamp: new Date().toISOString() });
        history[task.id] = entries;
        this.prevStatusMap.set(task.id, norm);
        dirty = true;
      }
    }

    if (dirty) {
      await writeHistory(history);
    }
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      this.started = false;
    }
  }
}

export const sseWatcher = new SSEWatcher();
