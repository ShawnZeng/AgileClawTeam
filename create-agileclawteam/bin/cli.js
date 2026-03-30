#!/usr/bin/env node
"use strict";

const { execSync, spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const REPO = "https://github.com/ShawnZeng/AgileClawTeam.git";
const targetDir = process.argv[2] || "agileclawteam";
const targetPath = path.resolve(process.cwd(), targetDir);

if (fs.existsSync(targetPath)) {
  console.error(
    `\nError: directory "${targetDir}" already exists. Please choose a different name.\n`,
  );
  process.exit(1);
}

const gitCheck = spawnSync("git", ["--version"], { stdio: "ignore" });
if (gitCheck.status !== 0) {
  console.error("\nError: git is required but not installed.");
  console.error("Alternatively, use the GitHub Template directly:");
  console.error("  https://github.com/ShawnZeng/AgileClawTeam/generate\n");
  process.exit(1);
}

console.log(`\nScaffolding AgileClawTeam into ./${targetDir} ...\n`);

try {
  execSync(`git clone --depth 1 ${REPO} "${targetPath}"`, { stdio: "inherit" });
} catch {
  console.error(
    "\nFailed to clone repository. Check your internet connection and try again.",
  );
  process.exit(1);
}

fs.rmSync(path.join(targetPath, ".git"), { recursive: true, force: true });

console.log(`
Done! Next steps:

  cd ${targetDir}
  npm install
  npm run dev

Open http://localhost:3000 in your browser.
`);
