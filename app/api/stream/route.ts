import { sseWatcher } from "@/lib/sse-watcher";
import { readBacklog, readTasks, readSprint, readAgents } from "@/lib/state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  // Start watcher if not already started
  await sseWatcher.start();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state on connect
      async function sendInitial() {
        const [backlog, tasks, sprint, agents] = await Promise.all([
          readBacklog().catch(() => []),
          readTasks().catch(() => []),
          readSprint().catch(() => ({})),
          readAgents().catch(() => []),
        ]);
        const snapshots = [
          { type: "backlog", data: backlog },
          { type: "tasks", data: tasks },
          { type: "sprint", data: sprint },
          { type: "agents", data: agents },
        ];
        for (const snapshot of snapshots) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`),
          );
        }
      }
      sendInitial().catch(console.error);

      // Listen for file changes
      const handler = (fileType: string) => {
        async function sendUpdate() {
          let data: unknown;
          switch (fileType) {
            case "backlog":
              data = await readBacklog().catch(() => []);
              break;
            case "tasks":
              data = await readTasks().catch(() => []);
              break;
            case "sprint":
              data = await readSprint().catch(() => ({}));
              break;
            case "agents":
              data = await readAgents().catch(() => []);
              break;
            default:
              return;
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: fileType, data })}\n\n`,
            ),
          );
        }
        sendUpdate().catch(console.error);
      };

      sseWatcher.on("state-change", handler);

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15000);

      // Cleanup on close
      return () => {
        sseWatcher.off("state-change", handler);
        clearInterval(heartbeat);
      };
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
