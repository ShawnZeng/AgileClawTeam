import { sseWatcher } from "@/lib/sse-watcher";
import { readBacklog, readTasks, readAllSprints, readAgents } from "@/lib/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  await sseWatcher.start();

  const encoder = new TextEncoder();

  // Hoist mutable state so the cancel() callback can reach it.
  // ReadableStream.start() returns are IGNORED by the spec —
  // cleanup must live in cancel().
  let isClosed = false;
  let changeHandler: ((fileType: string) => void) | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Safe enqueue: no-ops after the controller is closed.
      function enqueue(chunk: string) {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          isClosed = true;
        }
      }

      // Send full state snapshot on connect
      async function sendInitial() {
        const [backlog, tasks, sprints, agents] = await Promise.all([
          readBacklog().catch(() => []),
          readTasks().catch(() => []),
          readAllSprints().catch(() => []),
          readAgents().catch(() => []),
        ]);
        for (const snapshot of [
          { type: "backlog", data: backlog },
          { type: "tasks",   data: tasks   },
          { type: "sprint",  data: sprints },
          { type: "agents",  data: agents  },
        ]) {
          enqueue(`data: ${JSON.stringify(snapshot)}\n\n`);
        }
      }
      sendInitial().catch(console.error);

      // Subscribe to file-change events
      changeHandler = (fileType: string) => {
        async function sendUpdate() {
          let data: unknown;
          switch (fileType) {
            case "backlog": data = await readBacklog().catch(() => []); break;
            case "tasks":   data = await readTasks().catch(() => []);   break;
            case "sprint":  data = await readAllSprints().catch(() => []); break;
            case "agents":  data = await readAgents().catch(() => []);  break;
            default: return;
          }
          enqueue(`data: ${JSON.stringify({ type: fileType, data })}\n\n`);
        }
        sendUpdate().catch(console.error);
      };
      sseWatcher.on("state-change", changeHandler);

      // Heartbeat keeps the HTTP connection alive through proxies / load-balancers
      heartbeatTimer = setInterval(() => enqueue(": heartbeat\n\n"), 15000);
    },

    // Called by the Streams API when the client disconnects.
    // This is the ONLY reliable cleanup hook — start()'s return value is ignored.
    cancel() {
      isClosed = true;
      if (changeHandler) {
        sseWatcher.off("state-change", changeHandler);
        changeHandler = null;
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
