const en: Record<string, string> = {
  // ── Gateway chip ─────────────────────────────────────────────────────────
  "gateway.connected": "Gateway Connected",
  "gateway.connecting": "Gateway Connecting",
  "gateway.disconnected": "Gateway Disconnected",
  "gateway.systemConfigLink": "— Settings",

  // ── Header ───────────────────────────────────────────────────────────────
  "header.convPanel": "💬 Conversations",
  "header.systemConfig": "Settings",
  "header.backToDashboard": "← Back to Dashboard",

  // ── Side panel ───────────────────────────────────────────────────────────
  "panel.poTitle": "Assign Tasks to PO",
  "panel.poSub": "Product Owner · Requirements & Planning",
  "panel.worklogTitle": "{{taskId}} Work Log",
  "panel.worklogSub": "View {{agentId}}'s task progress",
  "panel.convTitle": "Conversation Log",
  "panel.convSub": "View Agent communication process",
  "panel.dragHint": "Drag to resize panel",
  "panel.tabChat": "Chat",
  "panel.tabConv": "Log",
  "panel.close": "Close panel",

  // ── Lang toggle ──────────────────────────────────────────────────────────
  "lang.label": "中文",
  "lang.switchToEn": "Switch to English",
  "lang.switchToZh": "切换到中文",

  // ── Setup page ───────────────────────────────────────────────────────────
  "setup.title": "System Settings",
  "setup.subtitle": "Check environment, configure workarea and tools",
  "setup.envCheck": "Environment Check",
  "setup.dataDir": "Data Directory",
  "setup.checking": "Checking…",
  "setup.undetectable": "Cannot detect",
  "setup.notInstalled": "Not installed",
  "setup.waitingForCli": "Waiting for CLI",
  "setup.waitingForPrereqs": "Waiting for prerequisites",
  "setup.gatewayConnected": "Connected {{addr}}",
  "setup.gatewayConnecting": "Connecting… {{addr}}",
  "setup.gatewayNotRunning": "Not running",
  "setup.cliVersionWarn": "v{{ver}} (requires ≥ {{min}})",
  "setup.cliVersionOk": "v{{ver}} ✓ ≥ {{min}}",
  "setup.agentsInstalled": "po, sm registered",
  "setup.agentsMissing": "{{agents}} pending registration",
  "setup.handshaking":
    "Gateway process running, WebSocket handshaking, please wait…",
  "setup.registering": "Registering…",
  "setup.registerAgents": "Register Agents in OpenClaw",
  "setup.agentsReregistered": "Agents re-registered",
  "setup.workspaceUpdated":
    "Workspace files updated, restart Gateway for full effect.",
  "setup.restarting": "Restarting…",
  "setup.restartGateway": "Restart Gateway Now",
  "setup.reregistering": "Re-registering…",
  "setup.reregisterAgents": "Re-register Agents",
  "setup.recheck": "Re-check",

  // ── Install guide ────────────────────────────────────────────────────────
  "install.title": "Install OpenClaw",
  "install.initAfter": "Initialize after install:",
  "install.viewDocs": "View install docs →",

  // ── Upgrade guide ────────────────────────────────────────────────────────
  "upgrade.title": "Version too low (current v{{current}}, need ≥ {{min}})",
  "upgrade.titleNoVersion": "Version too low",
  "upgrade.runCommand": "Run the following command to upgrade OpenClaw:",
  "upgrade.refreshAfter": "Refresh the page after upgrading.",

  // ── Gateway guide ────────────────────────────────────────────────────────
  "gwguide.startTitle": "Start Gateway",
  "gwguide.verifyStatus": "Verify status:",
  "gwguide.refreshAfter":
    "After starting, refresh the page; Dashboard will reconnect automatically.",

  // ── Setup guide ──────────────────────────────────────────────────────────
  "setupGuide.badge": "Setup Guide",
  "setupGuide.notRunning": "Gateway not running",
  "setupGuide.authFailed": "Authentication failed",
  "setupGuide.connectionError": "Connection error",
  "setupGuide.networkError": "Network error",
  "setupGuide.connecting": "Connecting...",
  "setupGuide.step.checkCli": "Confirm OpenClaw CLI is installed",
  "setupGuide.step.startGateway": "Start OpenClaw Gateway",
  "setupGuide.step.verifyHealth": "(Optional) Verify Gateway health",
  "setupGuide.step.checkToken": "Check Gateway authentication token",
  "setupGuide.step.configToken":
    "Configure the same token in dashboard/.env.local",
  "setupGuide.step.restartDev": "Restart `npm run dev` after changes",
  "setupGuide.step.noDashboardToken": "Dashboard has no token configured",
  "setupGuide.step.gatewayNeedsAuth":
    "Gateway requires auth but Dashboard provides no token…",
  "setupGuide.step.runDiagnostic": "Run diagnostic tool",
  "setupGuide.step.checkAddress": "Check Gateway connection address",
  "setupGuide.step.noteGatewayStart": "Gateway will start at {{url}}",
  "setupGuide.step.noteTokenPath":
    "Open ~/.openclaw/openclaw.json (gateway.auth.token field) or check OPENCLAW_GATEWAY_TOKEN in ~/.openclaw/.env",
  "setupGuide.step.noteAddress":
    "Current connection: {{addr}}. To change, set in dashboard/.env.local:",
  "setupGuide.autoRetry": "Dashboard auto-retries every 5 seconds",
  "setupGuide.docs": "OpenClaw config docs →",

  // ── Workarea section ─────────────────────────────────────────────────────
  "workarea.title": "Workarea Directory",
  "workarea.subtitle":
    "Agent outputs (code, docs, tests) are written to this directory",
  "workarea.loading": "Loading…",
  "workarea.saving": "Saving…",
  "workarea.save": "Save",
  "workarea.saved": "Saved",
  "workarea.saveFailed": "Save failed: {{error}}",
  "workarea.requestFailed": "Request failed",

  // ── ACP section ──────────────────────────────────────────────────────────
  "acp.title": "Programming Tools (ACP)",
  "acp.subtitle":
    "Agents invoke programming tools via ACP for code tasks (optional)",
  "acp.installFailed": "Install failed",
  "acp.installSuccess": "Installed successfully",
  "acp.installing": "Installing…",
  "acp.install": "Install",
  "acp.installed": "Installed",
  "acp.needsRestart": "acpx installed, restart Gateway to take effect.",
  "acp.priority": "Programming tool priority (highest to lowest)",
  "acp.notInstalled": "(Not installed)",
  "acp.savingPriority": "Saving…",
  "acp.savePriority": "Save Priority",
  "acp.requestFailed": "Request failed",
  "acp.loading": "Loading…",
  "acp.acpxPlugin": "acpx Plugin",

  // ── Reinstall dialog ─────────────────────────────────────────────────────
  "reinstall.title": "Re-register Agents",
  "reinstall.bodyPre": "This will ",
  "reinstall.bodyBold": "delete",
  "reinstall.bodyPost":
    " existing po and sm Agents from OpenClaw Gateway and regenerate Workspace config files.",
  "reinstall.warning":
    "Ongoing sessions will be interrupted. Confirm before proceeding.",
  "reinstall.langLabel": "Agent workspace language:",
  "reinstall.langZh": "Chinese (中文)",
  "reinstall.langEn": "English",
  "reinstall.cancel": "Cancel",
  "reinstall.confirmCountdown": "Confirm Re-register ({{s}}s)",
  "reinstall.confirm": "Confirm Re-register",

  // ── OpenclawStatus ───────────────────────────────────────────────────────
  "status.restartGateway": "Restart Gateway",
  "status.restarting": "Restarting…",
  "status.restartSuccess": "Restarted, waiting for reconnection…",
  "status.restartFailed": "Failed: {{error}}",
  "status.requestFailed": "Request failed",
  "status.hideGuide": "Hide setup guide",
  "status.showGuide": "View setup guide",
  "status.installDir": "Install directory",

  // ── InfoPanel ────────────────────────────────────────────────────────────
  "info.sprintEmpty": "No active Sprint",
  "info.sprintCommits": "{{n}} items committed",
  "info.backlogLabel": "Backlog",
  "info.backlogEmpty": "No items yet, chat with PO to create",
  "info.sprintStatus": "Sprint Status",
  "info.agentStatus": "Agent Status",
  "info.inSprint": "In Sprint",
  "info.moveToSprint": "Add to Sprint",
  "info.priority": "Priority",
  "info.taskCount": "{{done}}/{{total}} tasks",
  "info.acceptance": "Acceptance Criteria",
  "info.linkedTasks": "Linked Tasks",
  "info.artifacts": "🏆 Artifacts ({{n}} items)",

  // ── Sprint phases ────────────────────────────────────────────────────────
  "phase.planning": "Plan",
  "phase.executing": "Execute",
  "phase.reviewing": "Review",
  "phase.retrospective": "Retro",
  "phase.complete": "Done",
  "phase.inPlanning": "Planning",
  "phase.inExecuting": "In Progress",
  "phase.inReviewing": "In Review",
  "phase.inRetrospective": "Retrospective",
  "phase.completed": "Completed",

  // ── Status labels ────────────────────────────────────────────────────────
  "status.notStarted": "Not Started",
  "status.inProgress": "In Progress",
  "status.done": "Done",
  "status.blocked": "Blocked",
  "status.pending": "Pending",
  "status.waitingDep": "Waiting",
  "status.created": "Created",
  "status.active": "Active",
  "status.completed": "✓Done",
  "status.idle": "Idle",
  "status.working": "Working",
  "status.waiting": "Waiting",
  "status.offline": "Offline",
  "status.todo": "Todo",
  "status.notStartedShort": "Not Started",
  "status.doneShort": "Done",

  // ── Agent roles ──────────────────────────────────────────────────────────
  "role.po": "Product Owner",
  "role.sm": "Scrum Master",
  "role.developer": "Developer",
  "role.designer": "Designer",
  "role.tester": "Tester",

  // ── AgentsPanel ──────────────────────────────────────────────────────────
  "agents.title": "👥 Team",
  "agents.count": "{{n}} Agents",
  "agents.docEmpty": "(No content)",
  "agents.docError": "(Load failed)",
  "agents.docLoading": "Loading...",
  "agents.selectModel": "Select Model",
  "agents.noModels": "No available models, ensure OpenClaw is configured",
  "agents.currentModel": "✓ Current",
  "agents.codeModelTip":
    "💡 CODE models are optimized for programming tasks, recommended for developers",
  "agents.talkingWith": "Talking with {{name}}",
  "agents.editName": "Click to edit name",
  "agents.nameHint": "Role stays, name is editable",
  "agents.staleSession": "⚠ No active session{{age}}",
  "agents.executing": "Executing:",
  "agents.idle": "Waiting for new collaboration or task.",
  "agents.timeJustNow": "just now",
  "agents.timeMinutes": "{{n}}m ago",
  "agents.timeHours": "{{n}}h ago",
  "agents.timeDays": "{{n}}d ago",
  "agents.lastSession": "🔌 Last session: {{time}}",
  "agents.assignToPO": "Assign to PO",
  "agents.changeModel": "Click to change model",
  "agents.notConfigured": "Not configured",
  "agents.clickToSwitch": "— Click to switch",

  // ── MessageInput ─────────────────────────────────────────────────────────
  "msg.label": "Message PO",
  "msg.placeholder": "Message to PO… (Enter to send, Shift+Enter for newline)",
  "msg.sending": "Sending...",
  "msg.send": "Send",
  "msg.unknownError": "Unknown error",
  "msg.requestFailed": "Request failed",
  "msg.sent": "✓ Message sent",
  "msg.failedDefault": "Send failed, check OpenClaw connection",

  // ── POChatPanel ──────────────────────────────────────────────────────────
  "chat.title": "Chat with PO",
  "chat.sub": "Product Owner · Requirements & Planning",
  "chat.empty": "No conversation yet",
  "chat.emptySub": "Send a message to PO to start discussing requirements",
  "chat.you": "You",
  "chat.sending": "Sending…",
  "chat.retry": "Click to retry",
  "chat.placeholder": "Message… (Enter to send, Shift+Enter for newline)",
  "chat.send": "Send",

  // ── BacklogBoard ─────────────────────────────────────────────────────────
  "backlog.acceptance": "Acceptance Criteria:",
  "backlog.empty": "None",

  // ── TaskBoard ────────────────────────────────────────────────────────────
  "task.depsUnmet": "⚠ Dependencies unmet",
  "task.empty": "None",

  // ── BacklogTasksPanel ────────────────────────────────────────────────────
  "btp.notAssigned": "Unassigned",
  "btp.waitingDeps": "Waiting for deps",
  "btp.collapseArtifacts": "Collapse artifacts",
  "btp.expandArtifacts": "Expand artifacts",
  "btp.viewWorkLog": "View work log",
  "btp.waitingFor": "↳ Waiting: {{ids}}",
  "btp.tasksDoneFraction": "{{done}}/{{total}} tasks done",
  "btp.noItems": "No related items",
  "btp.startDate": "{{date}} start",
  "btp.smLabel": "SM",
  "btp.systemLabel": "System",
  "btp.smPatrol": "🔍 SM Patrol ({{n}})",
  "btp.empty": "No backlog items",
  "btp.emptySub": "Click 'Assign to PO' to start creating requirements",
  "btp.unplanned": "🗂 Unplanned Backlog ({{n}} items)",
  "btp.patrolLoading": "Loading...",
  "btp.patrolEmpty": "No content",
  "btp.itemTaskCount": "{{done}}/{{total}} tasks",
  "btp.collapseItemArtifacts": "Collapse artifact summary",
  "btp.expandItemArtifacts": "Expand artifact summary",
  "btp.inSprint": "In Sprint",
  "btp.moveToSprint": "Add to Sprint",
  "btp.raisePriority": "Raise Priority",
  "btp.lowerPriority": "Lower Priority",

  // ── ConversationViewer ───────────────────────────────────────────────────
  "conv.agentStatus": "Agent Status",
  "conv.lastActivity": "🕐 Last activity:",
  "conv.talkingWith": "↔ Communicating with {{agent}}",
  "conv.dependencies": "Deps: {{ids}}",
  "conv.session": "Session",
  "conv.noOwnSession":
    "{{agent}} has no dedicated session — showing SM patrol logs (includes task dispatch details)",
  "conv.taskFilter": "🔍 Related task {{id}}",
  "conv.foundSession": " — Found dedicated session",
  "conv.noSession":
    " — No dedicated session (will be auto-created next Sprint)",
  "conv.noHistory": "{{agent}} has no conversation history",
  "conv.sessionEmpty": "{{session}} has no messages",
  "conv.selectSession": "Please select a session",
  "conv.you": "You",
  "conv.userPo": "User/PO",
  "conv.msgCount": "({{n}})",

  // ── BoardView ────────────────────────────────────────────────────────────
  "board.backlog": "Backlog",
  "board.backlogEmpty": "No backlog items",
  "board.empty": "None",
  "board.teamStatus": "Team Status",
  "board.noAgents": "No agents",
  "board.noSprint": "No sprint",
  "board.sprintCommits": "Committed {{n}} items",
  "board.colPending": "Pending",
  "artifact.copy": "Copy",
  "artifact.copyPath": "Copy path",
  "artifact.copyCmd": "Copy command",
};

export default en;
