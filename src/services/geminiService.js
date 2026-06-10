import Groq from 'groq-sdk';
import { createLogger } from '../utils/logger.js';

const log = createLogger();
const MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const DEFAULT_SYSTEM = `You are a decision engine inside an automation pipeline.
Respond ONLY with valid JSON in this exact shape:
{ "decision": "<your decision or output>", "reasoning": "<brief explanation>" }
Do not include markdown fences or any text outside the JSON object.`;

function parseGroqResponse(rawText) {
  const trimmed = rawText.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      decision: parsed.decision ?? trimmed,
      reasoning: parsed.reasoning ?? '',
      raw: rawText,
    };
  } catch {
    return { decision: trimmed, reasoning: '', raw: rawText };
  }
}

export async function processWithGemini({ prompt, systemPrompt }) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not configured');
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  log.debug(`Calling Groq (${MODEL}) with prompt length ${prompt.length}`);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt || DEFAULT_SYSTEM },
      { role: 'user', content: prompt },
    ],
  });

  const rawText = completion.choices[0]?.message?.content || '';
  return parseGroqResponse(rawText);
}