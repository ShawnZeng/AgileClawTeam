import { NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const OPENCLAW_JSON = path.join(os.homedir(), ".openclaw", "openclaw.json");

export async function POST() {
  const steps: string[] = [];
  let needsRestart = false;

  try {
    // Step 1: Install acpx plugin
    try {
      const out = execSync("openclaw plugins install acpx", {
        encoding: "utf-8",
        timeout: 30000,
      });
      steps.push("acpx 插件安装成功");
      if (out.includes("Restart the gateway")) needsRestart = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // May already be installed — check for known "already installed" patterns
      if (!msg.includes("already")) {
        return NextResponse.json(
          { ok: false, error: `安装 acpx 失败：${msg}`, steps },
          { status: 500 },
        );
      }
      steps.push("acpx 已安装，跳过");
    }

    // Step 2: Enable ACP in openclaw.json
    try {
      const raw = await fs.readFile(OPENCLAW_JSON, "utf-8");
      const d = JSON.parse(raw) as Record<string, unknown>;

      const acp = (d.acp ?? {}) as Record<string, unknown>;
      let changed = false;
      if (!acp.enabled) {
        acp.enabled = true;
        changed = true;
      }
      if (!(acp.dispatch as Record<string, unknown>)?.enabled) {
        acp.dispatch = { enabled: true };
        changed = true;
      }
      d.acp = acp;

      // Ensure acpx is in plugins allow list
      const plugins = (d.plugins ?? {}) as Record<string, unknown>;
      const allow = (plugins.allow ?? []) as string[];
      if (!allow.includes("acpx")) {
        plugins.allow = [...allow, "acpx"];
        plugins.entries = {
          ...(plugins.entries as Record<string, unknown>),
          acpx: {
            enabled: true,
            config: {
              permissionMode: "approve-all",
              nonInteractivePermissions: "deny",
            },
          },
        };
        d.plugins = plugins;
        changed = true;
      }

      if (changed) {
        await fs.writeFile(OPENCLAW_JSON, JSON.stringify(d, null, 2), "utf-8");
        steps.push("openclaw.json ACP 配置已启用");
        needsRestart = true;
      } else {
        steps.push("openclaw.json ACP 已启用，跳过");
      }
    } catch (err) {
      steps.push(`更新 openclaw.json 失败：${String(err)}`);
    }

    return NextResponse.json({ ok: true, needsRestart, steps });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err), steps },
      { status: 500 },
    );
  }
}
