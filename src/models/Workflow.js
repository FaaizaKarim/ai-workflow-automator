import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

const insertStmt = db.prepare(`
  INSERT INTO workflows (id, name, definition, schedule, enabled, created_at, updated_at)
  VALUES (@id, @name, @definition, @schedule, @enabled, @created_at, @updated_at)
`);

const findByIdStmt = db.prepare('SELECT * FROM workflows WHERE id = ?');
const findAllStmt = db.prepare('SELECT * FROM workflows ORDER BY created_at DESC');
const findAllEnabledStmt = db.prepare('SELECT * FROM workflows WHERE enabled = 1 ORDER BY created_at DESC');
const findScheduledStmt = db.prepare(`
  SELECT * FROM workflows
  WHERE schedule IS NOT NULL AND schedule != '' AND enabled = 1
`);

const updateStmt = db.prepare(`
  UPDATE workflows
  SET name = @name, definition = @definition, schedule = @schedule,
      enabled = @enabled, updated_at = @updated_at
  WHERE id = @id
`);

const deleteStmt = db.prepare('DELETE FROM workflows WHERE id = ?');

function parseRow(row) {
  if (!row) return null;
  return {
    ...row,
    enabled: Boolean(row.enabled),
    definition: JSON.parse(row.definition),
  };
}

export function create({ name, definition, schedule = null, enabled = true }) {
  const now = new Date().toISOString();
  const record = {
    id: uuidv4(),
    name,
    definition: JSON.stringify(definition),
    schedule,
    enabled: enabled ? 1 : 0,
    created_at: now,
    updated_at: now,
  };
  insertStmt.run(record);
  return findById(record.id);
}

export function findById(id) {
  return parseRow(findByIdStmt.get(id));
}

export function findAll({ enabled } = {}) {
  const rows = enabled === 1 || enabled === '1'
    ? findAllEnabledStmt.all()
    : findAllStmt.all();
  return rows.map(parseRow);
}

export function findScheduled() {
  return findScheduledStmt.all().map(parseRow);
}

export function update(id, { name, definition, schedule, enabled }) {
  const existing = findById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  updateStmt.run({
    id,
    name: name ?? existing.name,
    definition: JSON.stringify(definition ?? existing.definition),
    schedule: schedule !== undefined ? schedule : existing.schedule,
    enabled: enabled !== undefined ? (enabled ? 1 : 0) : (existing.enabled ? 1 : 0),
    updated_at: now,
  });
  return findById(id);
}

export function remove(id) {
  const result = deleteStmt.run(id);
  return result.changes > 0;
}
