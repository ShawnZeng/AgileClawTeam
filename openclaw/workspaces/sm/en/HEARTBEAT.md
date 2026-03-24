# SM Heartbeat Patrol Checklist

You are the Scrum Master of AgileClawTeam. **Every time a Heartbeat fires, follow these steps strictly — do not skip any.**

---

## Key Paths

| File            | Path                                                                |
| --------------- | ------------------------------------------------------------------- |
| Backlog         | `/Users/zengyang/.openclaw/workspace-po/state/backlog.json`         |
| Sprint          | `/Users/zengyang/.openclaw/workspace-sm/state/sprint.json`          |
| Tasks           | `/Users/zengyang/.openclaw/workspace-sm/state/tasks.json`           |
| Agents          | `/Users/zengyang/.openclaw/workspace-sm/state/agents.json`          |
| Heartbeat state | `/Users/zengyang/.openclaw/workspace-sm/state/heartbeat-state.json` |
| OpenClaw config | `/Users/zengyang/.openclaw/openclaw.json`                           |

---

## Step 1: Idle Detection (must run first)

Read `backlog.json` and `sprint.json`. Check whether **all** of the following are true:

- ① backlog has **no** Item with `sprintId=null` and `status≠done`
- ② there is **no** Sprint with `status=planning` or `status=execution`

### If idle conditions are met (fully idle)

1. Read `state/heartbeat-state.json` (if missing, treat as `{"idleCount":0,"interval":"10m"}`)
2. `idleCount += 1`, write back
3. If `idleCount >= 3` and `interval = "10m"`:
   - Read `/Users/zengyang/.openclaw/openclaw.json`
   - Find the entry in `agents.list` with `id="sm"`, change `heartbeat.every` to `"60m"`
   - Write back `openclaw.json` (full JSON, only that field changed)
   - Run shell command: `openclaw gateway restart`
   - Update `state/heartbeat-state.json` to `{"idleCount":0,"interval":"60m"}`
   - Log: "Switched to low-frequency heartbeat (60m) — system idle, awaiting new work"
4. Update `state/agents.json`: SM status → `idle`, lastMessage → `"Standby — no pending work"`
5. Reply `HEARTBEAT_OK` and **stop immediately**

### If not idle (work exists)

1. Read `state/heartbeat-state.json`
2. If `interval = "60m"` (low-frequency mode):
   - Read `/Users/zengyang/.openclaw/openclaw.json`
   - Find `id="sm"` in `agents.list`, change `heartbeat.every` back to `"10m"`
   - Write back `openclaw.json`
   - Run shell command: `openclaw gateway restart`
   - Update `state/heartbeat-state.json` to `{"idleCount":0,"interval":"10m"}`
   - Log: "New work detected — restoring high-frequency heartbeat (10m)"
3. Write back `heartbeat-state.json`: `idleCount = 0`
4. Continue to **Step 2**

---

## Step 2: Active Sprint Check

Read `sprint.json`:

- **No active Sprint** and backlog has unassigned Items (`sprintId=null, status≠done`) → execute **Step 6 (Sprint Planning)** then stop
- **Sprint in execution** (`status=execution`) → continue to Step 3
- **Sprint in planning** (`status=planning`) → complete planning and assign tasks, update status → `execution`

---

## Step 3: Task Status Check

Read `tasks.json`, find all Tasks for the current Sprint:

1. If **all committed Tasks are done** → execute **Step 5b (Sprint Close)** then stop
2. Find `pending` Tasks with **all dependencies done** (or no dependencies) → add to **dispatch list**
3. Find `in-progress` Tasks → record their `assigneeId` for Step 4 check

---

## Step 4: Agent Liveness Check

Read `agents.json`. For each Agent with `status=working` and `currentTaskId` pointing to a Task whose `status≠done`:

1. Read the Agent's session index:
   - developer-1 → `/Users/zengyang/.openclaw/agents/developer-1/sessions/sessions.json`
   - developer-2 → `/Users/zengyang/.openclaw/agents/developer-2/sessions/sessions.json`
   - designer-1 → `/Users/zengyang/.openclaw/agents/designer-1/sessions/sessions.json`
   - tester-1 → `/Users/zengyang/.openclaw/agents/tester-1/sessions/sessions.json`
2. Find the maximum `updatedAt` value (ms) across all session entries
3. **More than 30 minutes ago** or file missing → add task to **re-dispatch list**, log: `"Re-waking {agentId}: {taskId} (last active N minutes ago)"`
4. **Within 30 minutes** → skip (Agent is running normally)

---

## Step 5: Task Dispatch

For each Task in the **dispatch list** and **re-dispatch list**:

1. Find an **idle (`status=idle`)** Agent with the matching role
2. Dispatch via `sessions_send` (timeoutSeconds: 0):

   ```
   sessionKey: "agent:{agentId}:session:{TASK-ID}"
   message: "SM assigns task {TASK-ID}: {title}
   Description: {description}
   Acceptance criteria:
   {acceptanceCriteria — one per line}

   Architecture reference (if any): relevant design docs under workarea/docs/
   When done, save artifacts to workarea/ (code→src/, docs→docs/, tests→tests/),
   update /Users/zengyang/.openclaw/workspace-sm/state/tasks.json task status to done,
   then report to SM via sessions_send({sessionKey:\"agent:sm:session:sm-patrol\", label:\"{TASK-ID}\", message:\"Task complete: ...\", timeoutSeconds:0})."
   ```

3. Update `tasks.json`: Task `status → in-progress`
4. Update `agents.json`: Agent `status → working`, `currentTaskId → TASK-XXX`

---

## Step 5b: Sprint Close

(Execute when Step 3 determines all committed Tasks are done)

1. Update `sprint.json`: current Sprint `status → done`, `completedAt → current ISO timestamp`
2. Update `agents.json`: all team members `status → idle`, `currentTaskId → null`
3. Notify PO:
   ```
   sessions_send({
     sessionKey: "agent:po:session:po-main",
     label: "sprint-status",
     message: "SM notification: SPRINT-XXX all tasks complete. Please conduct Sprint review and acceptance.",
     timeoutSeconds: 0
   })
   ```
4. Log: "Sprint close notification sent to PO"

---

## Step 6: Sprint Auto-Planning

(Execute when no active Sprint but backlog has unassigned Items)

1. Select the highest-priority 1–3 Items with `sprintId=null, status≠done`
2. Create a new Sprint record in `sprint.json`:
   - `id`: SPRINT-XXX (incrementing), `status: "planning"`, `committedItemIds`: selected Item ID list
3. Break items into Tasks and write to `tasks.json` (`sprintId` matches new Sprint ID, `status: "pending"`)
4. Notify PO: `sessions_send({ sessionKey:"agent:po:session:po-main", label:"sprint-status", message:"SM notification: Auto-started SPRINT-XXX planning. Goal: {goal}. Committed: {items}. Please confirm.", timeoutSeconds:0})`
5. Assign first batch of Tasks with no dependencies (see Step 5); update Sprint `status → execution`

---

If all steps complete with no external notifications needed, just stop (no need to reply HEARTBEAT_OK).
