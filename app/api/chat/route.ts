import { NextResponse } from "next/server";
import { getGatewayClient } from "@/lib/gateway-ws";
import { readBacklog, writeBacklog } from "@/lib/state";
import type { BacklogItem } from "@/lib/types";

// Parse <<BACKLOG_ITEM>>...<<BACKLOG_ITEM_END>> blocks from the PO's reply and
// persist them to backlog.json.  IDs are reassigned to avoid collisions.
async function persistBacklogItems(reply: string): Promise<void> {
  const pattern = /<<BACKLOG_ITEM>>\s*([\s\S]*?)\s*<<BACKLOG_ITEM_END>>/g;
  const parsed: BacklogItem[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(reply)) !== null) {
    try {
      parsed.push(JSON.parse(match[1]) as BacklogItem);
    } catch {
      // malformed JSON — skip
    }
  }
  if (parsed.length === 0) return;

  const backlog = await readBacklog();
  const now = new Date().toISOString();
  for (const item of parsed) {
    // Re-assign ID based on current backlog length to avoid conflicts
    const nextNum = backlog.length + 1;
    backlog.push({
      ...item,
      id: `ITEM-${String(nextNum).padStart(3, "0")}`,
      status: item.status ?? "pending",
      taskIds: item.taskIds ?? [],
      sprintId: item.sprintId ?? undefined,
      createdAt: item.createdAt ?? now,
      updatedAt: now,
    });
  }
  await writeBacklog(backlog);
}

export async function POST(request: Request) {
  try {
    const { message } = (await request.json()) as { message: string };
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }
    const client = getGatewayClient();
    const reply = await client.sendToAgent("po", message);

    // Persist any BacklogItems the PO included in its response
    if (reply) {
      await persistBacklogItems(reply).catch(() => { /* non-fatal */ });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status = msg.includes("not connected") ? 503 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
