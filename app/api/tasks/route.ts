import { NextResponse } from "next/server";
import { readTasks } from "@/lib/state";

export async function GET() {
  try {
    const tasks = await readTasks();
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
