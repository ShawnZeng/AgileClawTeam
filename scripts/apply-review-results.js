#!/usr/bin/env node
/**
 * apply-review-results.js
 * Parses PO review responses and updates backlog.json item statuses.
 * Usage: node apply-review-results.js --sprint SPRINT-001
 * Reads PO response from stdin: lines of "APPROVE ITEM-001" or "REJECT ITEM-002 reason"
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const sprintId = args[args.indexOf("--sprint") + 1] ?? "";

const STATE_DIR = path.resolve(__dirname, "../state");
const backlogPath = path.join(STATE_DIR, "backlog.json");

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  const backlog = JSON.parse(fs.readFileSync(backlogPath, "utf-8"));
  const lines = input.split("\n");

  let approvedCount = 0;
  let rejectedCount = 0;

  for (const line of lines) {
    const approveMatch = line.match(/APPROVE\s+(ITEM-\d+)/i);
    const rejectMatch = line.match(/REJECT\s+(ITEM-\d+)\s*(.*)/i);

    if (approveMatch) {
      const itemId = approveMatch[1].toUpperCase();
      const item = backlog.find((b) => b.id === itemId);
      if (item) {
        item.status = "done";
        item.updatedAt = new Date().toISOString();
        approvedCount++;
        console.error(`✅ Approved: ${itemId}`);
      }
    } else if (rejectMatch) {
      const itemId = rejectMatch[1].toUpperCase();
      const reason = rejectMatch[2]?.trim() ?? "";
      const item = backlog.find((b) => b.id === itemId);
      if (item) {
        item.status = "in-progress";
        item.updatedAt = new Date().toISOString();
        if (reason) {
          item.description = `${item.description}\n[PO Review Rejection]: ${reason}`;
        }
        rejectedCount++;
        console.error(`❌ Rejected: ${itemId} — ${reason}`);
      }
    }
  }

  fs.writeFileSync(backlogPath, JSON.stringify(backlog, null, 2), "utf-8");
  console.log(
    `Review applied: ${approvedCount} approved, ${rejectedCount} rejected`,
  );
});
