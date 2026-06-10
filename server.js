import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './src/config/db.js';
import * as cronService from './src/services/cronService.js';
import workflowsRouter from './src/routes/workflows.js';
import workflowExecutionsRouter from './src/routes/executions.js';
import executionsRouter from './src/routes/results.js';
import webhooksRouter from './src/routes/webhooks.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { createLogger } from './src/utils/logger.js';

const log = createLogger();
const PORT = parseInt(process.env.PORT, 10) || 3000;

const app = express();

app.use(cors({ origin: 'http://localhost:3001' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/workflows', workflowsRouter);
app.use('/api/workflows', workflowExecutionsRouter);
app.use('/api/executions', executionsRouter);
app.use('/api/webhooks', webhooksRouter);

app.use(errorHandler);

cronService.init();

app.listen(PORT, () => {
  log.info(`AI Workflow Automator running on http://localhost:${PORT}`);
  log.info(`Database: ${process.env.DB_PATH || './data/workflows.db'}`);
});

process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  db.close();
  process.exit(0);
});