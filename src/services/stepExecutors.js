import { fetchUrl } from './fetchService.js';
import { processWithAi } from './aiService.js';
import { processWithGemini } from './geminiService.js';
import { fireWebhook } from './webhookService.js';

async function executeFetchUrl(config, context, meta) {
  const result = await fetchUrl(config);
  return { status: result.status, body: result.body, headers: result.headers };
}

async function executeAiProcess(config, context, meta) {
  const { prompt, systemPrompt } = config;
  const aiResult = await processWithAi({ prompt, systemPrompt });
  return aiResult;
}

async function executeGeminiProcess(config, context, meta) {
  const { prompt, systemPrompt } = config;
  const result = await processWithGemini({ prompt, systemPrompt });
  return result;
}

async function executeStoreResult(config, context, meta) {
  const { key = 'stored', value } = config;
  const storedValue = value !== undefined ? value : context[`step${meta.stepIndex - 1}`];
  return { key, value: storedValue };
}

async function executeFireWebhook(config, context, meta) {
  const payload = config.payload !== undefined ? config.payload : context;
  const result = await fireWebhook(config, payload);
  return result;
}

export const stepExecutors = {
  fetch_url: executeFetchUrl,
  ai_process: executeAiProcess,
  gemini_process: executeGeminiProcess,
  store_result: executeStoreResult,
  fire_webhook: executeFireWebhook,
};

export const STEP_TYPES = Object.keys(stepExecutors);
