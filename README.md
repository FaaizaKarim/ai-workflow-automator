# AI Workflow Automator

A Node.js REST API backend where you define automation workflows as JSON and **Claude acts as the decision-making brain** at each step — not a chatbot bolted on, but the reasoning engine inside a real pipeline.

```
Fetch data → Claude decides → Store result → Fire webhook
```

## Tech Stack

- **Node.js + Express** — REST API
- **SQLite** (better-sqlite3) — persistence
- **Anthropic Claude** — AI decision engine
- **node-cron** — scheduled runs
- **axios** — HTTP fetching
- **HMAC webhooks** — signed outbound + verified inbound triggers

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY at minimum

# 3. Start the server
npm start
```

Server runs at `http://localhost:3000`. Database auto-creates at `./data/workflows.db` on first boot.

## How Claude Fits In

Most AI demos are chat wrappers. Here, Claude is a **step executor** inside a pipeline:

1. A `fetch_url` step pulls live data (API, RSS, etc.)
2. An `ai_process` step sends that data to Claude with a structured prompt
3. Claude returns JSON: `{ "decision": "...", "reasoning": "..." }`
4. Downstream steps use `{{context.stepN.field}}` templates to reference Claude's output
5. Conditional steps skip or fire based on Claude's decision

This mirrors production automation: fetch → reason → act.

## Workflow JSON Spec

### Top-level fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Human-readable workflow name |
| `steps` | array | yes | Ordered list of step objects |
| `trigger` | string | no | `"manual"` \| `"cron"` \| `"webhook"` (default: `"manual"`) |
| `schedule` | string | no | Cron expression (required for cron trigger) |
| `enabled` | boolean | no | Active flag (default: `true`) |
| `webhookKey` | string | no | Key for inbound webhook matching |

### Step object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | yes | Step type (see below) |
| `config` | object | yes | Step-specific configuration |
| `condition` | object | no | Skip step unless condition is met |

### Condition object

| Field | Type | Description |
|-------|------|-------------|
| `field` | string | Dot-path on context (e.g. `"step1.decision"`) |
| `operator` | string | `"eq"` \| `"neq"` \| `"gt"` \| `"lt"` \| `"exists"` \| `"truthy"` |
| `value` | any | Value to compare against |

### Step types

#### `fetch_url`

HTTP request step.

```json
{
  "type": "fetch_url",
  "config": {
    "url": "https://api.example.com/data",
    "method": "GET",
    "headers": {},
    "body": null,
    "timeout": 10000
  }
}
```

Output: `{ "status": 200, "body": {...}, "headers": {...} }`

#### `ai_process`

Claude decision step. Prompts support `{{context.stepN.body}}` template placeholders.

```json
{
  "type": "ai_process",
  "config": {
    "prompt": "Summarise this data: {{context.step0.body}}",
    "systemPrompt": "Respond ONLY in JSON: { \"decision\": \"...\", \"reasoning\": \"...\" }"
  }
}
```

Output: `{ "decision": "...", "reasoning": "...", "raw": "..." }`

#### `store_result`

Persist a value to the results table.

```json
{
  "type": "store_result",
  "config": {
    "key": "my_result",
    "value": "{{context.step1.decision}}"
  }
}
```

#### `fire_webhook`

POST payload to a URL with HMAC-SHA256 signature in `X-Signature` header.

```json
{
  "type": "fire_webhook",
  "config": {
    "url": "https://hooks.slack.com/services/...",
    "headers": {},
    "payload": { "text": "{{context.step1.decision}}" }
  }
}
```

### Template placeholders

Use `{{context.stepN.field}}` anywhere in step config strings:

```json
"prompt": "Analyse: {{context.step0.body}}"
```

## API Reference

Base URL: `http://localhost:3000/api`

### Workflows

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/workflows` | Create workflow |
| `GET` | `/workflows` | List all (`?enabled=1` to filter) |
| `GET` | `/workflows/:id` | Get single workflow |
| `PATCH` | `/workflows/:id` | Update workflow |
| `DELETE` | `/workflows/:id` | Delete workflow |

### Executions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/workflows/:id/run` | Trigger manual run (returns `{ executionId }` immediately) |
| `GET` | `/workflows/:id/executions` | Execution history (`?limit=50`) |
| `GET` | `/executions/:id` | Poll execution status |
| `GET` | `/executions/:id/results` | Step-by-step results including Claude decisions |

### Webhooks

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/webhooks/inbound` | Trigger workflow via signed webhook |

## Example: Run the Price Monitor

```bash
# Create workflow from example
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d @examples/price-monitor.json

# Copy the returned "id", then trigger a run
curl -X POST http://localhost:3000/api/workflows/<WORKFLOW_ID>/run

# Poll execution status
curl http://localhost:3000/api/executions/<EXECUTION_ID>

# Get Claude's decisions per step
curl http://localhost:3000/api/executions/<EXECUTION_ID>/results
```

## Example: News Summarizer (with cron)

```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Content-Type: application/json" \
  -d @examples/news-summarizer.json
```

Runs daily at 08:00 UTC when `ANTHROPIC_API_KEY` is set and the workflow is enabled.

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key (required for AI steps) | — |
| `GEMINI_API_KEY` | Reserved for future Gemini step type | — |
| `PORT` | Server port | `3000` |
| `DB_PATH` | SQLite file path | `./data/workflows.db` |
| `WEBHOOK_SECRET` | HMAC signing secret | — |
| `NODE_ENV` | `development` \| `production` | `development` |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` | `info` |
| `AI_MODEL` | Claude model ID | `claude-sonnet-4-20250514` |
| `AI_MAX_TOKENS` | Max tokens per AI call | `1024` |
| `FETCH_TIMEOUT_MS` | HTTP timeout for fetch steps | `10000` |
| `FETCH_RETRY_COUNT` | Retries on 5xx errors | `3` |

## Project Structure

```
ai-workflow-automator/
├── server.js                 # Entry point
├── src/
│   ├── config/
│   │   ├── db.js             # SQLite + migrations
│   │   └── anthropic.js      # Claude SDK client
│   ├── models/               # SQL helpers
│   ├── routes/               # REST endpoints
│   ├── services/             # Pipeline engine
│   ├── middleware/           # Validation, errors
│   └── utils/                # Logger, templates, context
├── examples/                 # Runnable workflow JSON
└── data/                     # SQLite DB (gitignored)
```

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  REST API   │────▶│  workflowRunner  │────▶│  SQLite DB  │
│  + Cron     │     │  (orchestrator)  │     │             │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         fetch_url      ai_process     fire_webhook
         (axios)        (Claude)       (HMAC POST)
```

Each step reads from and writes to a shared **runtime context**. Template placeholders resolve previous step outputs dynamically, so Claude's decisions flow through the entire pipeline.

## License

ISC
