import anthropic from '../config/anthropic.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger();
const MODEL = process.env.AI_MODEL || 'claude-sonnet-4-20250514';
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS, 10) || 1024;

const DEFAULT_SYSTEM = `You are a decision engine inside an automation pipeline.
Respond ONLY with valid JSON in this exact shape:
{ "decision": "<your decision or output>", "reasoning": "<brief explanation>" }
Do not include markdown fences or any text outside the JSON object.`;

function extractText(content) {
  return content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

function parseAiResponse(rawText) {
  const trimmed = rawText.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      decision: parsed.decision ?? parsed.output ?? trimmed,
      reasoning: parsed.reasoning ?? '',
      raw: rawText,
    };
  } catch {
    return {
      decision: trimmed,
      reasoning: '',
      raw: rawText,
    };
  }
}

export async function processWithAi({ prompt, systemPrompt }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  log.debug(`Calling Claude (${MODEL}) with prompt length ${prompt.length}`);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt || DEFAULT_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = extractText(response.content);
  return parseAiResponse(rawText);
}
