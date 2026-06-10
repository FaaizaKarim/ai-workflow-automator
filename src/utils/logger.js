const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const currentLevel = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

function formatMessage(level, workflowId, message) {
  const ts = new Date().toISOString();
  const ctx = workflowId ? ` [workflow:${workflowId}]` : '';
  return `[${ts}] [${level.toUpperCase()}]${ctx} ${message}`;
}

function shouldLog(level) {
  return LEVELS[level] >= currentLevel;
}

export function createLogger(workflowId = null) {
  return {
    debug(msg) {
      if (shouldLog('debug')) console.debug(formatMessage('debug', workflowId, msg));
    },
    info(msg) {
      if (shouldLog('info')) console.info(formatMessage('info', workflowId, msg));
    },
    warn(msg) {
      if (shouldLog('warn')) console.warn(formatMessage('warn', workflowId, msg));
    },
    error(msg) {
      if (shouldLog('error')) console.error(formatMessage('error', workflowId, msg));
    },
  };
}

export default createLogger();
