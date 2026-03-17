import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const HOME = os.homedir();

/** Build a PATH that includes common npm/nvm global bin locations.
 *  Cached at module level — execSync only runs once per server lifetime.
 */
let _cachedEnhancedPath: string | null = null;
function buildEnhancedPath(): string {
  if (_cachedEnhancedPath) return _cachedEnhancedPath;

  const base = process.env.PATH ?? "";
  let npmGlobalBin = "";
  try {
    const prefix = execSync("npm config get prefix", {
      encoding: "utf-8",
      timeout: 3_000,
      env: { ...process.env, PATH: `${base}:/usr/local/bin:/opt/homebrew/bin` },
    }).trim();
    if (prefix) npmGlobalBin = path.join(prefix, "bin");
  } catch {
    /* ignore */
  }

  _cachedEnhancedPath = [
    base,
    "/usr/local/bin",
    "/opt/homebrew/bin",
    "/usr/bin",
    npmGlobalBin,
    path.join(HOME, ".npm-global", "bin"),
    path.join(HOME, ".local", "bin"),
    path.join(HOME, "bin"),
  ]
    .filter(Boolean)
    .join(":");

  return _cachedEnhancedPath;
}

const TOOL_SPECS: Record<
  string,
  { installCmd: string; bins: string[]; label: string }
> = {
  claude: {
    installCmd: "npm install -g @anthropic-ai/claude-code",
    bins: ["claude"],
    label: "Claude Code",
  },
  codex: {
    installCmd: "npm install -g @openai/codex",
    bins: ["codex"],
    label: "Codex CLI",
  },
};

export async function POST(req: Request) {
  const body = (await req.json()) as { tool?: string };
  const tool = body.tool ?? "";

  const spec = TOOL_SPECS[tool];
  if (!spec) {
    return NextResponse.json({ ok: false, error: "未知工具" }, { status: 400 });
  }

  const enhancedPath = buildEnhancedPath();
  const env = { ...process.env, PATH: enhancedPath };

  // Find npm binary explicitly so the install command doesn't rely on PATH alone
  let npmBin = "npm";
  try {
    npmBin = execSync("which npm", {
      encoding: "utf-8",
      timeout: 5_000,
      env,
    }).trim();
  } catch {
    /* fall back to bare "npm" */
  }

  const installCmd = spec.installCmd.replace(/^npm /, `${npmBin} `);

  try {
    execSync(installCmd, {
      encoding: "utf-8",
      timeout: 180_000, // 3 minutes
      env,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    // npm writes progress to stderr; extract the useful last line
    const lastLine = raw.split("\n").filter(Boolean).at(-1) ?? raw;
    return NextResponse.json(
      { ok: false, error: `安装 ${spec.label} 失败：${lastLine}` },
      { status: 500 },
    );
  }

  // Verify binary is reachable after install
  const binaryFound = spec.bins.some((bin) => {
    // Check via which
    try {
      execSync(`which ${bin}`, { encoding: "utf-8", timeout: 5_000, env });
      return true;
    } catch {
      /* not in PATH */
    }
    // Check common global bin locations directly
    const dirs = [
      "/usr/local/bin",
      "/opt/homebrew/bin",
      path.join(HOME, ".npm-global", "bin"),
      path.join(HOME, ".local", "bin"),
    ];
    return dirs.some((d) => existsSync(path.join(d, bin)));
  });

  if (!binaryFound) {
    return NextResponse.json({
      ok: false,
      error: `${spec.label} 已安装，但找不到可执行文件。请在终端运行：npm install -g ${tool === "claude" ? "@anthropic-ai/claude-code" : "@openai/codex"}，然后刷新此页面。`,
    });
  }

  return NextResponse.json({ ok: true, steps: [`${spec.label} 安装成功`] });
}
