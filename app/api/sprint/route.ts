import { NextResponse } from "next/server";
import { readAllSprints } from "@/lib/state";

export async function GET() {
  try {
    const sprints = await readAllSprints();
    return NextResponse.json(sprints);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
