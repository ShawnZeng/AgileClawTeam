import { EventEmitter } from "events";
import path from "path";
import { STATE_DIRS } from "./state";

class SSEWatcher extends EventEmitter {
  private watcher: ReturnType<typeof import("chokidar").watch> | null = null;
  private started = false;

  async start() {
    if (this.started) return;
    this.started = true;

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
        this.emit("state-change", file);
      }
    });
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
