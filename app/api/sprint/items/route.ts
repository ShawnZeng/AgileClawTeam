import { NextResponse } from "next/server";
import {
  readBacklog,
  readSprint,
  writeBacklog,
  writeSprint,
} from "@/lib/state";
import type { Sprint } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const { itemId } = (await request.json()) as { itemId: string };
    if (!itemId)
      return NextResponse.json({ error: "itemId required" }, { status: 400 });

    const [backlog, sprint] = await Promise.all([readBacklog(), readSprint()]);

    const item = backlog.find((b) => b.id === itemId);
    if (!item)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Ensure sprint exists; create a default one if empty
    const now = new Date().toISOString();
    const currentSprint: Sprint = sprint?.id
      ? sprint
      : {
          id: "SPRINT-001",
          number: 1,
          goal: "",
          status: "planning",
          committedItemIds: [],
          startedAt: now,
        };

    const committedItemIds = currentSprint.committedItemIds ?? [];
    if (!committedItemIds.includes(itemId)) {
      committedItemIds.push(itemId);
    }

    const updatedSprint: Sprint = { ...currentSprint, committedItemIds };
    const updatedBacklog = backlog.map((b) =>
      b.id === itemId
        ? {
            ...b,
            sprintId: currentSprint.id,
            status: "in-progress" as const,
            updatedAt: now,
          }
        : b,
    );

    await Promise.all([
      writeBacklog(updatedBacklog),
      writeSprint(updatedSprint),
    ]);
    return NextResponse.json({ ok: true, sprintId: currentSprint.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
