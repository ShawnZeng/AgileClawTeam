"use client";

import { useState } from "react";
import type { Artifact } from "@/lib/types";

// ── Style maps ─────────────────────────────────────────────────────────────────

const FORM_STYLE: Record<string, string> = {
  代码: "text-emerald-400 border-emerald-800/50",
  设计文档: "text-amber-400   border-amber-800/50",
  测试报告: "text-rose-400    border-rose-800/50",
  配置文件: "text-sky-400     border-sky-800/50",
  文档: "text-violet-400  border-violet-800/50",
};

const FORM_ICON: Record<string, string> = {
  代码: "⚙️",
  设计文档: "🎨",
  测试报告: "✅",
  配置文件: "⚡",
  文档: "📖",
};

function formStyle(form: string) {
  return FORM_STYLE[form] ?? "text-gray-400 border-gray-700/50";
}
function formIcon(form: string) {
  return FORM_ICON[form] ?? "📦";
}

// ── Command detection ──────────────────────────────────────────────────────────

const CLI_RE =
  /^(python\d?|pytest|node|npm|npx|yarn|bun|bash|sh|ts-node|deno|go|cargo)\b/;

/**
 * If usage starts with a recognisable CLI command, split it into
 * { cmd: "python foo.py -v", desc: "启动服务" }.
 * Returns null when the usage is purely descriptive.
 */
function extractCommand(usage: string): { cmd: string; desc: string } | null {
  if (!CLI_RE.test(usage)) return null;
  // Split at the first Chinese character — everything before is the command
  const chineseIdx = usage.search(/[\u4e00-\u9fa5]/);
  if (chineseIdx > 0) {
    return {
      cmd: usage.slice(0, chineseIdx).trim(),
      desc: usage.slice(chineseIdx).trim(),
    };
  }
  return { cmd: usage, desc: "" };
}

// ── Tiny helpers ───────────────────────────────────────────────────────────────

function InlineCopy({
  text,
  title = "复制",
  className = "text-gray-700 hover:text-gray-300",
}: {
  text: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <button
      onClick={handle}
      title={title}
      className={`shrink-0 text-[9px] transition-colors leading-none ${className}`}
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ArtifactList({ artifacts }: { artifacts: Artifact[] }) {
  if (artifacts.length === 0) return null;

  return (
    <div className="space-y-1">
      {artifacts.map((a, i) => {
        const parsed = a.usage ? extractCommand(a.usage) : null;
        const colorCls = formStyle(a.form);

        return (
          <div
            key={i}
            className={`rounded border px-2 py-1.5 bg-gray-900/40 ${colorCls}`}
          >
            {/* Row 1: icon + type badge + path + copy */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] shrink-0 leading-none">
                {formIcon(a.form)}
              </span>
              <span
                className={`shrink-0 text-[9px] font-medium px-1 py-0.5 rounded border ${colorCls}`}
              >
                {a.form}
              </span>
              <span
                className="text-[10px] text-gray-400 font-mono truncate flex-1 min-w-0"
                title={a.location}
              >
                {a.location}
              </span>
              <InlineCopy text={a.location} title="复制路径" />
            </div>

            {/* Row 2: usage — command line or plain description */}
            {a.usage &&
              (parsed ? (
                <div className="mt-1 ml-[22px] space-y-0.5">
                  {/* CLI block */}
                  <div className="flex items-center gap-1 bg-gray-950/70 rounded px-1.5 py-0.5 font-mono text-[10px] text-green-400 border border-gray-800/60">
                    <span className="text-gray-600 select-none">$</span>
                    <span className="flex-1 truncate" title={parsed.cmd}>
                      {parsed.cmd}
                    </span>
                    <InlineCopy
                      text={parsed.cmd}
                      title="复制命令"
                      className="text-gray-500 hover:text-green-300"
                    />
                  </div>
                  {parsed.desc && (
                    <p
                      className="text-[9px] text-gray-600 truncate"
                      title={parsed.desc}
                    >
                      {parsed.desc}
                    </p>
                  )}
                </div>
              ) : (
                <p
                  className="mt-0.5 ml-[22px] text-[9px] text-gray-600 truncate"
                  title={a.usage}
                >
                  {a.usage}
                </p>
              ))}
          </div>
        );
      })}
    </div>
  );
}
