const PLACEHOLDER_REGEX = /\{\{([^}]+)\}\}/g;

function resolvePath(obj, path) {
  return path.split('.').reduce((current, key) => {
    if (current == null) return undefined;
    return current[key];
  }, obj);
}

export function parseTemplate(str, context) {
  if (typeof str !== 'string') return str;

  return str.replace(PLACEHOLDER_REGEX, (_, path) => {
    const trimmed = path.trim();
    const value = resolvePath(context, trimmed);
    if (value === undefined || value === null) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  });
}

export function parseConfigTemplates(config, context) {
  if (config == null) return config;
  if (typeof config === 'string') return parseTemplate(config, context);
  if (Array.isArray(config)) return config.map((item) => parseConfigTemplates(item, context));
  if (typeof config === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(config)) {
      result[key] = parseConfigTemplates(value, context);
    }
    return result;
  }
  return config;
}
