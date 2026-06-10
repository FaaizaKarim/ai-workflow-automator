import { Router } from 'express';
import * as Workflow from '../models/Workflow.js';
import * as Execution from '../models/Execution.js';
import * as workflowRunner from '../services/workflowRunner.js';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router({ mergeParams: true });

router.post(
  '/:id/run',
  asyncWrapper(async (req, res) => {
    const workflow = Workflow.findById(req.params.id);
    if (!workflow) throw new NotFoundError('Workflow not found');
    if (!workflow.enabled) throw new NotFoundError('Workflow is disabled');

    const { executionId } = workflowRunner.run(workflow, { trigger: 'manual' });
    res.status(202).json({ executionId });
  })
);

router.get(
  '/:id/executions',
  asyncWrapper(async (req, res) => {
    const workflow = Workflow.findById(req.params.id);
    if (!workflow) throw new NotFoundError('Workflow not found');

    const limit = parseInt(req.query.limit, 10) || 50;
    const executions = Execution.findByWorkflow(req.params.id, limit);
    res.json(executions);
  })
);

export default router;
