import crypto from 'crypto';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const log = createLogger();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'dev-secret';

export function signPayload(payload) {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return { body, signature };
}

export function verifySignature(payload, signature) {
  if (!signature) return false;
  const { signature: expected } = signPayload(payload);
  try {
    const sigBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

export async function fireWebhook(config, payload) {
  const { url, headers = {} } = config;
  const { body, signature } = signPayload(payload);

  try {
    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        ...headers,
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    const success = response.status >= 200 && response.status < 300;
    if (success) {
      log.info(`Webhook delivered to ${url} (${response.status})`);
    } else {
      log.warn(`Webhook to ${url} returned ${response.status}`);
    }

    return {
      success,
      status: response.status,
      body: response.data,
    };
  } catch (err) {
    log.error(`Webhook to ${url} failed: ${err.message}`);
    return {
      success: false,
      error: err.message,
    };
  }
}
