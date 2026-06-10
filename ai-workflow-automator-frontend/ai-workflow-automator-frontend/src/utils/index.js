export const fmt     = str => str ? new Date(str).toLocaleString()   : '—';
export const fmtDate = str => str ? new Date(str).toLocaleDateString() : '—';
export const dur     = (s, e) => {
  if (!s || !e) return '—';
  const ms = new Date(e) - new Date(s);
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
};
