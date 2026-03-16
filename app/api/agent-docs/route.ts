import { NextResponse } from "next/server";
import path from "path";
import os from "os";
import { readFile } from "fs/promises";

const INSTALL_DIR = path.join(os.homedir(), ".openclaw");
const ALLOWED = ["SOUL.md", "AGENTS.md", "BOOTSTRAP.md"];

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");
  const file = searchParams.get("file");

  if (!agentId || !file || !ALLOWED.includes(file) || agentId.includes("/")) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 });
  }

  const filePath = path.join(INSTALL_DIR, `workspace-${agentId}`, file);
  try {
    const content = await readFile(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
