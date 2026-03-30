# AgileClawTeam — Agent Reference

> This file is written for AI agents (GitHub Copilot, Claude, Cursor, etc.) to quickly understand and work with this repository.

## What This Repository Is

**AgileClawTeam** is a fully autonomous, self-coordinating multi-agent Scrum team built on [OpenClaw](https://openclaw.dev). It orchestrates five role-based AI agents — PO, SM, Designer, Developer, and Tester — to execute product backlogs end-to-end, from requirement breakdown to sprint execution, code delivery, testing, and retrospective.

The project is a **Next.js application** (TypeScript) that:

- Connects to a local OpenClaw Gateway (AI agent middleware) via WebSocket and SSE
- Exposes a real-time dashboard for monitoring agent status, backlog, sprint, tasks, and messages
- Stores shared state as JSON files in `state/`
- Lets agents write deliverables (code, docs, test reports) into `workarea/`

**npm package**: [`agileclawteam`](https://www.npmjs.com/package/agileclawteam)  
**GitHub**: https://github.com/ShawnZeng/AgileClawTeam  
**License**: MIT

---

## Key Technologies

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| Framework        | Next.js 16 (App Router)            |
| Language         | TypeScript 5                       |
| Agent middleware | OpenClaw >= 2026.3.12              |
| Runtime          | Node.js >= 20, npm >= 10           |
| Styling          | Tailwind CSS                       |
| Real-time        | SSE + WebSocket (OpenClaw Gateway) |

---

## Quick Start (for an agent performing setup tasks)

```bash
# Option A: scaffold with npx
npx create-agileclawteam my-team
cd my-team
npm install
npm run dev
# Open http://localhost:3000 — first launch shows setup wizard
```

Alternatively, use the **[GitHub Template](https://github.com/ShawnZeng/AgileClawTeam/generate)** to generate a new repo, then clone and `npm install`.

Optional `.env.local` (only when OpenClaw Gateway is not on default `127.0.0.1:18789`):

```ini
OPENCLAW_GATEWAY_HOST=192.168.1.20
OPENCLAW_GATEWAY_PORT=19000
# OPENCLAW_GATEWAY_TOKEN=your_token_here
```

---

## Repository Structure

```
app/                    Next.js App Router — pages and API routes
  api/
    agents/             Agent status endpoints
    backlog/            Backlog CRUD
    chat/               PO chat relay
    config/             System configuration and ACP/tool install
    messages/           Message retrieval
    sprint/             Sprint management
    tasks/              Task CRUD
    stream/             SSE stream for real-time state push
    openclaw/           OpenClaw Gateway proxy and restart
components/             React dashboard components
lib/
  types.ts              Shared TypeScript types (Agent, Task, BacklogItem, Sprint, etc.)
  state.ts              Server-side shared state helpers
  gateway-ws.ts         WebSocket connection to OpenClaw Gateway
  sse-watcher.ts        SSE file-watch broadcaster
openclaw/
  agile-config.json     Project-level agent configuration (model, token limits, etc.)
  openclaw.json         OpenClaw agent workspace registration
  workspaces/           Per-agent prompt files (SOUL.md, BOOTSTRAP.md, AGENTS.md, etc.)
    po/                 Product Owner agent config
    sm/                 Scrum Master agent config
    designer-1/         Designer agent config
    developer-1/        Developer agent config
    developer-2/        Second developer slot
    tester-1/           Tester agent config
    team/               Shared team-level context
  prose/                Workflow narrative documents consumed by agents
  lobster/              Approval and review automation scripts (.lobster)
state/
  agents.json           Live agent status (role, status, current task)
  backlog.json          Product backlog items
  sprint.json           Active sprint
  tasks.json            Task breakdown for the current sprint
  messages.json         Inter-agent and boss message log
  TEAM_MEMORY.md        Persistent team memory written by agents
workarea/
  src/                  Agent-generated source code
  docs/                 Agent-generated design documents
  tests/                Agent-generated test reports
scripts/
  apply-review-results.js     Post-review state update helper
  generate-sprint-summary.js  Sprint summary generator
```

---

## Agent Roles and Responsibilities

| Role            | Key file                                  | Primary responsibility                                         |
| --------------- | ----------------------------------------- | -------------------------------------------------------------- |
| `po`            | `openclaw/workspaces/po/SOUL.md`          | Clarifies requirements, creates BacklogItems, accepts delivery |
| `sm`            | `openclaw/workspaces/sm/SOUL.md`          | Plans sprints, breaks down tasks, drives cadence, runs patrol  |
| `designer-1`    | `openclaw/workspaces/designer-1/SOUL.md`  | Writes UI/UX proposals and design docs into `workarea/docs/`   |
| `developer-1/2` | `openclaw/workspaces/developer-1/SOUL.md` | Implements features, writes code into `workarea/src/`          |
| `tester-1`      | `openclaw/workspaces/tester-1/SOUL.md`    | Validates behavior, writes test reports into `workarea/tests/` |

---

## Core Data Shapes (lib/types.ts)

Key interfaces an agent should know when reading or writing state files:

- **`BacklogItem`** — `{ id, title, description, acceptanceCriteria, priority, status }`
- **`Sprint`** — `{ id, goal, status, startDate, endDate, committedItems[] }`
- **`Task`** — `{ id, sprintId, backlogItemId, title, assignedRole, status, artifacts[] }`
- **`AgentStatus`** — `{ role, status, currentTask, lastSeen }`
- **`Message`** — `{ id, from, to, content, timestamp, type }`

---

## API Routes (app/api/)

| Route                   | Method       | Purpose                           |
| ----------------------- | ------------ | --------------------------------- |
| `/api/agents`           | GET          | List all agent statuses           |
| `/api/backlog`          | GET / POST   | List or create backlog items      |
| `/api/backlog/[id]`     | PUT / DELETE | Update or delete a backlog item   |
| `/api/sprint`           | GET / POST   | Get active sprint or create one   |
| `/api/tasks`            | GET / POST   | List or create tasks              |
| `/api/messages`         | GET          | Retrieve message log              |
| `/api/chat`             | POST         | Send a message to the PO          |
| `/api/config`           | GET / POST   | Read or write `agile-config.json` |
| `/api/stream`           | GET (SSE)    | Real-time state change stream     |
| `/api/openclaw`         | GET          | OpenClaw Gateway status           |
| `/api/openclaw/restart` | POST         | Restart OpenClaw Gateway          |
| `/api/artifact/open`    | POST         | Open an artifact file in the OS   |

---

## How to Customize Agents

1. Edit the relevant `SOUL.md` inside `openclaw/workspaces/<role>/` to change role behavior.
2. Edit `openclaw/prose/` files to change workflow narratives.
3. Edit `openclaw/agile-config.json` to change models, token budgets, or tool access per role.
4. After changes, re-activate agents: Dashboard → System Settings → Re-activate Agent.

---

## Common Tasks for an Assisting Agent

| Task                             | Where to act                                     |
| -------------------------------- | ------------------------------------------------ |
| Add a backlog item               | POST `/api/backlog` or edit `state/backlog.json` |
| Check what agents are doing      | GET `/api/agents` or read `state/agents.json`    |
| Review the current sprint        | GET `/api/sprint` or read `state/sprint.json`    |
| Read agent-generated code        | `workarea/src/`                                  |
| Read agent-generated design docs | `workarea/docs/`                                 |
| Read test results                | `workarea/tests/`                                |
| Change a role's behavior         | Edit `openclaw/workspaces/<role>/SOUL.md`        |
| Change workflow steps            | Edit `openclaw/prose/*.prose`                    |

---

## Notes for AI Agents

- All state files are plain JSON. Agents may read and write them directly when needed.
- `state/TEAM_MEMORY.md` contains persistent team-level context written by agents across sessions. Read this for historical context.
- The OpenClaw Gateway must be running locally for agent communication to work.
- The dashboard at `http://localhost:3000` provides visual confirmation of all state.
- This project is MIT-licensed. Feel free to use, fork, and extend it.
