import * as Execution from '../models/Execution.js';
import * as Result from '../models/Result.js';
import { stepExecutors } from './stepExecutors.js';
import { createInitialContext, mergeStepOutput } from '../utils/contextBuilder.js';
import { parseConfigTemplates } from '../utils/templateParser.js';
import { createLogger } from '../utils/logger.js';

function evaluateCondition(condition, context) {
  if (!condition) return true;

  const { field, operator = 'eq', value } = condition;
  const parts = field.split('.');
  let actual = context;
  for (const part of parts) {
    actual = actual?.[part];
  }

  switch (operator) {
    case 'eq':
      return actual == value;
    case 'neq':
      return actual != value;
    case 'gt':
      return Number(actual) > Number(value);
    case 'lt':
      return Number(actual) < Number(value);
    case 'exists':
      return actual !== undefined && actual !== null;
    case 'truthy':
      return Boolean(actual);
    default:
      return true;
  }
}

async function executeSteps(workflow, executionId, trigger, inboundPayload) {
  const workflowId = workflow.id;
  const definition = workflow.definition;
  const steps = definition.steps || [];
  const log = createLogger(workflowId);

  let context = createInitialContext(trigger, inboundPayload);
  context.workflow = { id: workflowId, name: workflow.name };
  let failedSteps = 0;
  let lastError = null;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepType = step.type;

    if (step.condition && !evaluateCondition(step.condition, context)) {
      log.info(`Step ${i} (${stepType}) skipped — condition not met`);
      continue;
    }

    const executor = stepExecutors[stepType];
    if (!executor) {
      lastError = `Unknown step type: ${stepType}`;
      failedSteps++;
      log.error(`Step ${i}: ${lastError}`);
      break;
    }

    const resolvedConfig = parseConfigTemplates(step.config || {}, {
      context,
      ...context,
    });

    log.info(`Step ${i} (${stepType}) starting`);

    try {
      const output = await executor(resolvedConfig, context, {
        executionId,
        stepIndex: i,
        workflowId,
      });

      context = mergeStepOutput(context, i, stepType, output);

      Result.create({
        executionId,
        stepIndex: i,
        stepType,
        output,
      });

      log.info(`Step ${i} (${stepType}) completed`);
    } catch (err) {
      failedSteps++;
      lastError = err.message;
      log.error(`Step ${i} (${stepType}) failed: ${err.message}`);

      Result.create({
        executionId,
        stepIndex: i,
        stepType,
        output: { error: err.message },
      });
    }
  }

  let status;
  if (failedSteps === 0) {
    status = 'success';
  } else if (failedSteps < steps.length) {
    status = 'partial';
  } else {
    status = 'failed';
  }

  Result.create({
    executionId,
    stepIndex: steps.length,
    stepType: '_final_context',
    output: context,
  });

  Execution.updateStatus(executionId, {
    status,
    error: lastError,
  });

  log.info(`Execution ${executionId} finished with status: ${status}`);

  return { executionId, status, error: lastError };
}

export function run(workflow, { trigger = 'manual', inboundPayload = null } = {}) {
  const workflowId = workflow.id;
  const log = createLogger(workflowId);

  const execution = Execution.create({ workflowId, trigger });
  const executionId = execution.id;

  log.info(`Execution ${executionId} started (${trigger})`);

  executeSteps(workflow, executionId, trigger, inboundPayload).catch((err) => {
    log.error(`Execution ${executionId} crashed: ${err.message}`);
    Execution.updateStatus(executionId, {
      status: 'failed',
      error: err.message,
    });
  });

  return { executionId };
}

export async function runAndWait(workflow, options = {}) {
  const { trigger = 'manual', inboundPayload = null } = options;
  const execution = Execution.create({ workflowId: workflow.id, trigger });
  const log = createLogger(workflow.id);
  log.info(`Execution ${execution.id} started (${trigger})`);
  return executeSteps(workflow, execution.id, trigger, inboundPayload);
}
