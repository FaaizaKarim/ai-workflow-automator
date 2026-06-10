import { Router } from 'express';
import * as Execution from '../models/Execution.js';
import * as Result from '../models/Result.js';
import { asyncWrapper } from '../middleware/asyncWrapper.js';
import { NotFoundError } from '../utils/errors.js';

const router = Router();

router.get(
  '/:id',
  asyncWrapper(async (req, res) => {
    const execution = Execution.findById(req.params.id);
    if (!execution) throw new NotFoundError('Execution not found');
    res.json(execution);
  })
);

router.get(
  '/:id/results',
  asyncWrapper(async (req, res) => {
    const execution = Execution.findById(req.params.id);
    if (!execution) throw new NotFoundError('Execution not found');

    const results = Result.findByExecution(req.params.id);
    res.json(results);
  })
);

export default router;
