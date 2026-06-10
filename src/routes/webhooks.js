import { Router } from 'express';
import * as Workflow from '../models/Workflow.js';
import * as workflowRunner from '../services/workflowRunner.js';
import { verifySignature } from '../services/webhookService.js';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = Router();

router.post(
  '/inbound',
  asyncWrapper(async (req, res) => {
    const signature = req.headers['x-signature'];
    if (!verifySignature(req.body, signature)) {
      throw new ValidationError('Invalid webhook signature');
    }

    const { webhookKey, workflowId } = req.body;

    let workflow = null;
    if (workflowId) {
      workflow = Workflow.findById(workflowId);
    } else if (webhookKey) {
      const all = Workflow.findAll();
      workflow = all.find(
        (w) => w.definition.webhookKey === webhookKey && w.definition.trigger === 'webhook'
      );
    }

    if (!workflow) {
      throw new NotFoundError('No matching webhook-triggered workflow found');
    }
    if (!workflow.enabled) {
      throw new NotFoundError('Workflow is disabled');
    }

    const { executionId } = workflowRunner.run(workflow, {
      trigger: 'webhook',
      inboundPayload: req.body,
    });

    res.status(202).json({ executionId, workflowId: workflow.id });
  })
);

export default router;
