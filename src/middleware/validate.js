import { ValidationError } from '../utils/errors.js';
import { STEP_TYPES } from '../services/stepExecutors.js';

const VALID_TRIGGERS = ['manual', 'cron', 'webhook'];

function validateStep(step, index) {
  if (!step || typeof step !== 'object') {
    throw new ValidationError(`Step ${index} must be an object`);
  }
  if (!step.type || !STEP_TYPES.includes(step.type)) {
    throw new ValidationError(
      `Step ${index} has invalid type "${step.type}". Must be one of: ${STEP_TYPES.join(', ')}`
    );
  }
  if (!step.config || typeof step.config !== 'object') {
    throw new ValidationError(`Step ${index} must have a config object`);
  }
}

export function validateWorkflowBody(body) {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Request body must be a JSON object');
  }
  if (!body.name || typeof body.name !== 'string') {
    throw new ValidationError('Workflow must have a "name" string');
  }
  if (!Array.isArray(body.steps) || body.steps.length === 0) {
    throw new ValidationError('Workflow must have a non-empty "steps" array');
  }
  if (body.trigger && !VALID_TRIGGERS.includes(body.trigger)) {
    throw new ValidationError(`Invalid trigger. Must be one of: ${VALID_TRIGGERS.join(', ')}`);
  }
  if (body.schedule != null && typeof body.schedule !== 'string') {
    throw new ValidationError('Schedule must be a cron string or null');
  }

  body.steps.forEach((step, i) => validateStep(step, i));

  return {
    name: body.name,
    definition: {
      name: body.name,
      schedule: body.schedule ?? null,
      trigger: body.trigger ?? 'manual',
      steps: body.steps,
      webhookKey: body.webhookKey ?? null,
    },
    schedule: body.schedule ?? null,
    enabled: body.enabled !== false,
  };
}

export function validateWorkflowMiddleware(req, res, next) {
  try {
    req.validatedWorkflow = validateWorkflowBody(req.body);
    next();
  } catch (err) {
    next(err);
  }
}
