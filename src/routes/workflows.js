import { Router } from 'express';
import * as Workflow from '../models/Workflow.js';
import * as cronService from '../services/cronService.js';
import { validateWorkflowBody, validateWorkflowMiddleware } from '../middleware/validate.js';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

function formatWorkflow(workflow) {
  return {
    id: workflow.id,
    name: workflow.name,
    definition: workflow.definition,
    schedule: workflow.schedule,
    enabled: workflow.enabled,
    createdAt: workflow.created_at,
    updatedAt: workflow.updated_at,
  };
}

router.post(
  '/',
  validateWorkflowMiddleware,
  asyncWrapper(async (req, res) => {
    const { name, definition, schedule, enabled } = req.validatedWorkflow;
    const workflow = Workflow.create({ name, definition, schedule, enabled });

    if (schedule && enabled) {
      cronService.register(workflow);
    }

    res.status(201).json(formatWorkflow(workflow));
  })
);

router.get(
  '/',
  asyncWrapper(async (req, res) => {
    const { enabled } = req.query;
    const workflows = Workflow.findAll({ enabled });
    res.json(workflows.map(formatWorkflow));
  })
);

router.get(
  '/:id',
  asyncWrapper(async (req, res) => {
    const workflow = Workflow.findById(req.params.id);
    if (!workflow) throw new NotFoundError('Workflow not found');
    res.json(formatWorkflow(workflow));
  })
);

router.patch(
  '/:id',
  asyncWrapper(async (req, res) => {
    const existing = Workflow.findById(req.params.id);
    if (!existing) throw new NotFoundError('Workflow not found');

    let updates = {};
    if (req.body.definition || req.body.steps) {
      const validated = validateWorkflowBody({
        name: req.body.name ?? existing.name,
        steps: req.body.steps ?? existing.definition.steps,
        schedule: req.body.schedule !== undefined ? req.body.schedule : existing.schedule,
        trigger: req.body.trigger ?? existing.definition.trigger,
        enabled: req.body.enabled !== undefined ? req.body.enabled : existing.enabled,
        webhookKey: req.body.webhookKey ?? existing.definition.webhookKey,
      });
      updates = validated;
    } else {
      updates = {
        name: req.body.name,
        schedule: req.body.schedule,
        enabled: req.body.enabled,
      };
    }

    const workflow = Workflow.update(req.params.id, updates);
    cronService.cancel(workflow.id);
    if (workflow.schedule && workflow.enabled) {
      cronService.register(workflow);
    }

    res.json(formatWorkflow(workflow));
  })
);

router.delete(
  '/:id',
  asyncWrapper(async (req, res) => {
    const existing = Workflow.findById(req.params.id);
    if (!existing) throw new NotFoundError('Workflow not found');

    cronService.cancel(req.params.id);
    Workflow.remove(req.params.id);
    res.status(204).send();
  })
);

export default router;
