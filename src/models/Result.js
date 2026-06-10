import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';

const insertStmt = db.prepare(`
  INSERT INTO results (id, execution_id, step_index, step_type, output, created_at)
  VALUES (@id, @execution_id, @step_index, @step_type, @output, @created_at)
`);

const findByExecutionStmt = db.prepare(`
  SELECT * FROM results WHERE execution_id = ?
  ORDER BY step_index ASC
`);

export function create({ executionId, stepIndex, stepType, output }) {
  const record = {
    id: uuidv4(),
    execution_id: executionId,
    step_index: stepIndex,
    step_type: stepType,
    output: JSON.stringify(output),
    created_at: new Date().toISOString(),
  };
  insertStmt.run(record);
  return {
    id: record.id,
    executionId,
    stepIndex,
    stepType,
    output,
    createdAt: record.created_at,
  };
}

export function findByExecution(executionId) {
  return findByExecutionStmt.all(executionId).map((row) => ({
    id: row.id,
    executionId: row.execution_id,
    stepIndex: row.step_index,
    stepType: row.step_type,
    output: JSON.parse(row.output),
    createdAt: row.created_at,
  }));
}
