import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  let filePath: string | undefined;
  try {
    const body = (await request.json()) as { path?: string };
    filePath = body.path;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!filePath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  // Normalize path: expand ~ to home directory
  const expandedPath = filePath.startsWith("~")
    ? filePath.replace("~", os.homedir())
    : filePath;

  // Security: only allow paths under home directory or /tmp
  const resolved = path.resolve(expandedPath);
  if (!resolved.startsWith(os.homedir()) && !resolved.startsWith("/tmp")) {
    return NextResponse.json({ error: "path access denied" }, { status: 403 });
  }

  // Best-effort open — failure (e.g. file not found) is silently ignored
  const platform = process.platform;
  let command = "";
  if (platform === "darwin") command = `open "${resolved}"`;
  else if (platform === "linux") command = `xdg-open "${resolved}"`;
  else if (platform === "win32") command = `start "" "${resolved}"`;

  if (command) {
    await execAsync(command).catch(() => {
      /* file may not exist yet */
    });
  }

  return NextResponse.json({ ok: true });
}
