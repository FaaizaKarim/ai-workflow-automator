import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

const insertStmt = db.prepare(`
  INSERT INTO executions (id, workflow_id, status, trigger, error, started_at, finished_at)
  VALUES (@id, @workflow_id, @status, @trigger, @error, @started_at, @finished_at)
`);

const findByIdStmt = db.prepare('SELECT * FROM executions WHERE id = ?');
const findByWorkflowStmt = db.prepare(`
  SELECT * FROM executions WHERE workflow_id = ?
  ORDER BY started_at DESC
  LIMIT ?
`);

const updateStatusStmt = db.prepare(`
  UPDATE executions
  SET status = @status, error = @error, finished_at = @finished_at
  WHERE id = @id
`);

export function create({ workflowId, trigger = 'manual' }) {
  const record = {
    id: uuidv4(),
    workflow_id: workflowId,
    status: 'running',
    trigger,
    error: null,
    started_at: new Date().toISOString(),
    finished_at: null,
  };
  insertStmt.run(record);
  return findById(record.id);
}

export function findById(id) {
  const row = findByIdStmt.get(id);
  if (!row) return null;
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    trigger: row.trigger,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export function findByWorkflow(workflowId, limit = 50) {
  return findByWorkflowStmt.all(workflowId, limit).map((row) => ({
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status,
    trigger: row.trigger,
    error: row.error,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}

export function updateStatus(id, { status, error = null }) {
  updateStatusStmt.run({
    id,
    status,
    error,
    finished_at: new Date().toISOString(),
  });
  return findById(id);
}
