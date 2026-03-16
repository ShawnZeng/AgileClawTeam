import { NextResponse } from "next/server";
import { readSprint } from "@/lib/state";

export async function GET() {
  try {
    const sprint = await readSprint();
    return NextResponse.json(sprint);
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
