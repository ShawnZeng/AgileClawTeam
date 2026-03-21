#!/usr/bin/env node
/**
 * generate-sprint-summary.js
 * Generates a readable summary of sprint tasks and backlog item completion.
 * Usage: node generate-sprint-summary.js --sprint SPRINT-001 [--for-boss]
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const sprintId = args[args.indexOf("--sprint") + 1] ?? "";
const forBoss = args.includes("--for-boss");

const STATE_DIR = path.resolve(__dirname, "../state");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(path.join(STATE_DIR, file), "utf-8"));
  } catch {
    return null;
  }
}

const backlog = readJson("backlog.json") ?? [];
const tasks = readJson("tasks.json") ?? [];
const sprint = readJson("sprint.json") ?? {};

const targetSprint = sprintId ? sprint : sprint;
const sprintTasks = tasks.filter((t) => t.sprintId === sprintId || !sprintId);
const committedItemIds = targetSprint?.committedItemIds ?? [];

const lines = [];

if (!forBoss) {
  lines.push(`# Sprint ${sprintId} 完成情况报告`);
  lines.push(`目标: ${targetSprint?.goal ?? "N/A"}`);
  lines.push(`状态: ${targetSprint?.status ?? "N/A"}`);
  lines.push("");
}

for (const itemId of committedItemIds) {
  const item = backlog.find((b) => b.id === itemId);
  if (!item) continue;

  const itemTasks = sprintTasks.filter((t) => t.itemId === itemId);
  const doneTasks = itemTasks.filter((t) => t.status === "done");
  const blockedTasks = itemTasks.filter((t) => t.status === "blocked");

  const statusIcon =
    item.status === "done" ? "✅" : item.status === "in-progress" ? "🔄" : "⏳";

  lines.push(`${statusIcon} ${item.id}: ${item.title}`);

  if (!forBoss) {
    lines.push(`   任务完成: ${doneTasks.length}/${itemTasks.length}`);
    if (blockedTasks.length > 0) {
      lines.push(`   阻塞任务: ${blockedTasks.map((t) => t.id).join(", ")}`);
    }
    lines.push(`   验收标准:`);
    for (const criteria of item.acceptanceCriteria ?? []) {
      lines.push(`     - ${criteria}`);
    }
  } else {
    lines.push(`   ${item.description ?? ""}`);
  }
  lines.push("");
}

if (!forBoss) {
  const totalTasks = sprintTasks.length;
  const totalDone = sprintTasks.filter((t) => t.status === "done").length;
  const totalBlocked = sprintTasks.filter((t) => t.status === "blocked").length;
  lines.push(`---`);
  lines.push(
    `总任务: ${totalTasks}, 完成: ${totalDone}, 阻塞: ${totalBlocked}`,
  );
}

console.log(lines.join("\n"));
