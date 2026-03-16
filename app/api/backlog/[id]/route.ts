import { NextResponse } from "next/server";
import { readBacklog, writeBacklog } from "@/lib/state";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { priority } = (await request.json()) as { priority: number };

    if (typeof priority !== "number" || priority < 1 || priority > 10) {
      return NextResponse.json(
        { error: "priority must be 1–10" },
        { status: 400 },
      );
    }

    const backlog = await readBacklog();
    const idx = backlog.findIndex((b) => b.id === id);
    if (idx === -1)
      return NextResponse.json({ error: "Item not found" }, { status: 404 });

    backlog[idx] = {
      ...backlog[idx]!,
      priority,
      updatedAt: new Date().toISOString(),
    };
    await writeBacklog(backlog);
    return NextResponse.json({ ok: true, item: backlog[idx] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
