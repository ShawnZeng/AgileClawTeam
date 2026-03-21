# AgileClawTeam

An agile multi-agent collaboration system built on [OpenClaw](https://openclaw.dev). Five AI agents — Product Owner, Scrum Master, Designer, Developer(s), and Tester — run a complete Scrum workflow autonomously, coordinated through a Next.js dashboard.

## Architecture

```
You (Boss)
  │  Dashboard UI / Feishu / QQ Bot
  ▼
OpenClaw Gateway (127.0.0.1:18789)
  ├── po       — Product Owner: manages backlog, talks to Boss
  ├── sm       — Scrum Master: plans sprints, assigns tasks
  ├── designer-1  — UI/UX Designer
  ├── developer-1 — Developer #1
  ├── developer-2 — Developer #2
  └── tester-1    — QA Tester
```

State is stored in OpenClaw agent workspaces (`~/.openclaw/workspace-*/state/`). The dashboard reads state via the file system and communicates with agents through the OpenClaw Gateway WebSocket API.

## Requirements

- [OpenClaw](https://openclaw.dev) installed and running
- Node.js 20+
- npm 10+

## Quick Start

**1. Install and start OpenClaw**

Follow the [OpenClaw installation guide](https://openclaw.dev/docs/install). Make sure the Gateway is running on `127.0.0.1:18789`.

**2. Set up agents**

Open the dashboard and go to **Settings → OpenClaw Setup** to automatically register all agents into your OpenClaw installation.

Alternatively, copy the workspace templates manually:

```bash
# Copy each agent workspace to your OpenClaw installation
cp -r openclaw/workspaces/po ~/.openclaw/workspace-po
cp -r openclaw/workspaces/sm ~/.openclaw/workspace-sm
# ... repeat for designer-1, developer-1, developer-2, tester-1
```

**3. Configure the dashboard**

```bash
cp .env.local.example .env.local
# Edit .env.local if your Gateway runs on a non-default host/port
```

**4. Install dependencies and start**

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
/
├── app/                  Next.js App Router pages and API routes
├── components/           React UI components (dashboard, boards, panels)
├── lib/                  Shared utilities (state reader, WebSocket client, types)
├── public/               Static assets
├── openclaw/             OpenClaw configuration for this project
│   ├── openclaw.json     Agent definitions and Gateway settings
│   ├── agile-config.json Project-specific settings (workarea path, AI tool prefs)
│   ├── workspaces/       Agent workspace templates (SOUL, IDENTITY, BOOTSTRAP, etc.)
│   ├── prose/            OpenProse workflow definitions (sprint lifecycle, reviews…)
│   └── lobster/          Lobster automation scripts (boss-review, item-approval)
└── scripts/              Utility scripts for sprint management
    ├── apply-review-results.js   Parse PO review responses and update backlog
    └── generate-sprint-summary.js  Generate sprint completion reports
```

## Configuration

### Changing agent models

Edit `openclaw/openclaw.json` — each agent has a `model` field. Models follow the `provider/model-id` format (e.g. `anthropic/claude-haiku-4-5-20251001`, `huoshan/doubao-seed-2.0-pro`).

The dashboard's **Agent Models** panel also lets you change models at runtime.

### Gateway auth token

If your OpenClaw Gateway is configured with an auth token, add it to `.env.local`:

```
OPENCLAW_GATEWAY_TOKEN=your_token_here
```

## Scripts

```bash
# Generate a sprint summary report
node scripts/generate-sprint-summary.js --sprint SPRINT-001

# Apply PO review results to backlog (pipe review text via stdin)
echo "APPROVE ITEM-001\nREJECT ITEM-002 needs more detail" | \
  node scripts/apply-review-results.js --sprint SPRINT-001
```

## License

MIT
