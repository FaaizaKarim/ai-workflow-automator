import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/workflows.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    definition TEXT NOT NULL,
    schedule TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    trigger TEXT NOT NULL,
    error TEXT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    FOREIGN KEY (workflow_id) REFERENCES workflows(id)
  );

  CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    step_index INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    output TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (execution_id) REFERENCES executions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_executions_workflow_id ON executions(workflow_id);
  CREATE INDEX IF NOT EXISTS idx_results_execution_id ON results(execution_id);
`);

export default db;
