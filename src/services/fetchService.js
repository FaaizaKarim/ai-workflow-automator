import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const log = createLogger();
const DEFAULT_TIMEOUT = parseInt(process.env.FETCH_TIMEOUT_MS, 10) || 10000;
const RETRY_COUNT = parseInt(process.env.FETCH_RETRY_COUNT, 10) || 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchUrl(config) {
  const {
    url,
    method = 'GET',
    headers = {},
    body,
    timeout = DEFAULT_TIMEOUT,
  } = config;

  let lastError;

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const response = await axios({
        url,
        method,
        headers,
        data: body,
        timeout,
        validateStatus: () => true,
      });

      const result = {
        status: response.status,
        headers: response.headers,
        body: response.data,
      };

      if (response.status >= 500 && attempt < RETRY_COUNT) {
        const delay = Math.pow(2, attempt) * 500;
        log.warn(`Fetch ${url} returned ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${RETRY_COUNT})`);
        await sleep(delay);
        continue;
      }

      return result;
    } catch (err) {
      lastError = err;
      if (attempt < RETRY_COUNT) {
        const delay = Math.pow(2, attempt) * 500;
        log.warn(`Fetch ${url} failed: ${err.message}, retrying in ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error(`Failed to fetch ${url}`);
}
