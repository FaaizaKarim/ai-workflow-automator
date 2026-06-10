import cron from 'node-cron';
import * as Workflow from '../models/Workflow.js';
import * as workflowRunner from './workflowRunner.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger();
const scheduledJobs = new Map();

export function register(workflow) {
  cancel(workflow.id);

  const schedule = workflow.schedule;
  if (!schedule || !workflow.enabled) return;

  if (!cron.validate(schedule)) {
    log.warn(`Invalid cron expression for workflow ${workflow.id}: ${schedule}`);
    return;
  }

  const task = cron.schedule(schedule, () => {
    log.info(`Cron triggered for workflow ${workflow.id}`);
    workflowRunner.run(workflow, { trigger: 'cron' }).catch((err) => {
      log.error(`Cron execution failed for workflow ${workflow.id}: ${err.message}`);
    });
  });

  scheduledJobs.set(workflow.id, task);
  log.info(`Registered cron job for workflow ${workflow.id}: ${schedule}`);
}

export function cancel(workflowId) {
  const existing = scheduledJobs.get(workflowId);
  if (existing) {
    existing.stop();
    scheduledJobs.delete(workflowId);
    log.info(`Cancelled cron job for workflow ${workflowId}`);
  }
}

export function init() {
  const workflows = Workflow.findScheduled();
  log.info(`Loading ${workflows.length} scheduled workflow(s)`);
  for (const workflow of workflows) {
    register(workflow);
  }
}

export function listScheduled() {
  return Array.from(scheduledJobs.keys());
}
