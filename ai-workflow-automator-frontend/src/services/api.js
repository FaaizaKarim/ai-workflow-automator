const BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  if (res.status === 204) return null;
  return res.json();
}

// ── Demo data shown when API is unreachable ───────────────────────────────────
const DEMO_WORKFLOWS = [
  {
    id: 'wf-001', name: 'Daily News Summarizer', enabled: true,
    schedule: '0 9 * * *',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    definition: { trigger: 'scheduled', steps: [
      { type: 'fetch_url',      name: 'Fetch news feed',  config: { url: 'https://feeds.bbc.com/news' } },
      { type: 'gemini_process', name: 'AI summarize',     config: { prompt: 'Summarize the top 3 stories' } },
      { type: 'store_result',   name: 'Save summary',     config: {} },
    ]},
  },
  {
    id: 'wf-002', name: 'Stock Price Monitor', enabled: true,
    schedule: '*/15 9-17 * * 1-5',
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    definition: { trigger: 'scheduled', steps: [
      { type: 'fetch_url',      name: 'Fetch price data',  config: { url: 'https://api.example.com/stocks' } },
      { type: 'gemini_process', name: 'Buy/sell decision', config: { prompt: 'Should I buy or sell?' } },
      { type: 'store_result',   name: 'Log decision',      config: {} },
    ]},
  },
  {
    id: 'wf-003', name: 'Weekly Report Builder', enabled: false,
    schedule: '0 8 * * 1',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    definition: { trigger: 'scheduled', steps: [
      { type: 'fetch_url',      name: 'Get report data', config: { url: 'https://api.example.com/reports' } },
      { type: 'gemini_process', name: 'Format report',   config: { prompt: 'Create a weekly summary' } },
      { type: 'store_result',   name: 'Save report',     config: {} },
    ]},
  },
];

const DEMO_EXECUTIONS = {
  'wf-001': [
    { id: 'ex-101', workflow_id: 'wf-001', status: 'success', trigger: 'scheduled', started_at: new Date(Date.now() - 3600000).toISOString(),    finished_at: new Date(Date.now() - 3597000).toISOString() },
    { id: 'ex-102', workflow_id: 'wf-001', status: 'success', trigger: 'scheduled', started_at: new Date(Date.now() - 90000000).toISOString(),   finished_at: new Date(Date.now() - 89997000).toISOString() },
    { id: 'ex-103', workflow_id: 'wf-001', status: 'failed',  trigger: 'manual',    started_at: new Date(Date.now() - 172800000).toISOString(),  finished_at: new Date(Date.now() - 172798000).toISOString() },
  ],
  'wf-002': [
    { id: 'ex-201', workflow_id: 'wf-002', status: 'success', trigger: 'scheduled', started_at: new Date(Date.now() - 900000).toISOString(),  finished_at: new Date(Date.now() - 898000).toISOString() },
    { id: 'ex-202', workflow_id: 'wf-002', status: 'running', trigger: 'manual',    started_at: new Date(Date.now() - 30000).toISOString(),   finished_at: null },
  ],
};

const DEMO_RESULTS = {
  'ex-101': [
    { step_index: 0, step_name: 'Fetch news feed',  step_type: 'fetch_url',      status: 'success', output: JSON.stringify({ status: 200 }),                                                                                            created_at: new Date(Date.now() - 3600000).toISOString() },
    { step_index: 1, step_name: 'AI summarize',     step_type: 'gemini_process', status: 'success', output: JSON.stringify({ decision: 'BUY', reasoning: 'Strong market signals. RSI at 62 suggests upward momentum without overbought conditions.' }), created_at: new Date(Date.now() - 3599000).toISOString() },
    { step_index: 2, step_name: 'Save summary',     step_type: 'store_result',   status: 'success', output: JSON.stringify({ key: 'news-summary-2024-01-15' }),                                                                          created_at: new Date(Date.now() - 3598000).toISOString() },
  ],
};

let _online = false;

async function tryLive(fn, fallback) {
  try {
    const result = await fn();
    _online = true;
    return result;
  } catch {
    _online = false;
    return typeof fallback === 'function' ? fallback() : fallback;
  }
}

function normalizeWorkflow(wf) {
  if (!wf) return null;
  return {
    ...wf,
    id: wf.id || wf._id,
    createdAt: wf.createdAt || wf.created_at,
    updatedAt: wf.updatedAt || wf.updated_at,
  };
}

function normalizeExecution(ex) {
  if (!ex) return null;
  const workflowId = ex.workflowId || ex.workflow_id;
  const startedAt = ex.startedAt || ex.started_at;
  const finishedAt = ex.finishedAt || ex.finished_at;
  return {
    ...ex,
    id: ex.id || ex._id,
    workflowId,
    workflow_id: workflowId,
    startedAt,
    started_at: startedAt,
    finishedAt,
    finished_at: finishedAt,
  };
}

function normalizeResult(r) {
  if (!r) return null;
  return {
    ...r,
    step_index: r.step_index ?? r.stepIndex,
    step_type: r.step_type ?? r.stepType,
    step_name: r.step_name ?? r.stepName,
    created_at: r.created_at ?? r.createdAt,
  };
}

export const api = {
  isOnline:       ()         => _online,
  getWorkflows:   ()         => tryLive(async () => { const r = await request('/workflows'); return (r || []).map(normalizeWorkflow); }, [...DEMO_WORKFLOWS]),
  getWorkflow:    (id)       => tryLive(async () => normalizeWorkflow(await request(`/workflows/${id}`)), DEMO_WORKFLOWS.find(w => w.id === id) || null),
  createWorkflow: (data)     => tryLive(async () => normalizeWorkflow(await request('/workflows', { method: 'POST', body: JSON.stringify(data) })), () => ({ ...data, id: `wf-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })),
  updateWorkflow: (id, data) => tryLive(async () => normalizeWorkflow(await request(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) })), { id, ...data }),
  deleteWorkflow: (id)       => tryLive(() => request(`/workflows/${id}`, { method: 'DELETE' }), null),
  runWorkflow:    (id)       => tryLive(() => request(`/workflows/${id}/run`, { method: 'POST' }), { execution_id: `ex-${Date.now()}` }),
  getExecutions:  (wfId)     => tryLive(async () => { const r = await request(`/workflows/${wfId}/executions?limit=20`); return (r || []).map(normalizeExecution); }, (DEMO_EXECUTIONS[wfId] || []).map(normalizeExecution)),
  getResults:     (execId)   => tryLive(async () => { const r = await request(`/executions/${execId}/results`); return (r || []).map(normalizeResult); }, (DEMO_RESULTS[execId] || []).map(normalizeResult)),
};