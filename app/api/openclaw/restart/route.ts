import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST() {
  try {
    await execAsync("openclaw gateway restart");
    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as { message: string; stderr?: string };
    return NextResponse.json(
      { ok: false, error: err.stderr ?? err.message },
      { status: 500 },
    );
  }
}
