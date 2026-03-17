import { NextResponse } from "next/server";
import { readTaskHistory } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  const history = await readTaskHistory();
  return NextResponse.json(history);
}
