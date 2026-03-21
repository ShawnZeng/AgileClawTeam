import { NextResponse } from "next/server";
import {
  readBacklog,
  readBacklogWithArtifacts,
  writeBacklog,
} from "@/lib/state";
import type { BacklogItem } from "@/lib/types";

export async function GET() {
  try {
    const backlog = await readBacklogWithArtifacts();
    return NextResponse.json(backlog);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BacklogItem>;
    const backlog = await readBacklog();
    const newItem: BacklogItem = {
      id: `ITEM-${String(backlog.length + 1).padStart(3, "0")}`,
      title: body.title ?? "Untitled",
      description: body.description ?? "",
      priority: body.priority ?? 99,
      status: "pending",
      acceptanceCriteria: body.acceptanceCriteria ?? [],
      taskIds: [],
      sprintId: body.sprintId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    backlog.push(newItem);
    await writeBacklog(backlog);
    return NextResponse.json(newItem, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
